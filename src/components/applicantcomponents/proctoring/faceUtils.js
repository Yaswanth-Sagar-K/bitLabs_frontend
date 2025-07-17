
import * as faceapi from 'face-api.js'; 
import { apiUrl } from '../../../services/ApplicantAPIService';



// Load all models
export const loadModels = async (modelPath = '/models') => {
  await Promise.all([
    // faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
    faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath),
    faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
    faceapi.nets.faceRecognitionNet.loadFromUri(modelPath),
    faceapi.nets.faceExpressionNet.loadFromUri(modelPath),
  ]);
  console.log('All face-api.js models loaded');
};

// Start webcam stream
export const startVideo = async (videoRef, setWebcamError, webcamStreamRef) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
    webcamStreamRef.current = stream;
    setWebcamError(false);
  } catch (error) {
    console.error('Error accessing webcam:', error);
    setWebcamError(true);
  }
};

// Stop webcam stream
export const stopVideo = (videoRef, webcamStreamRef) => {
  const stream = webcamStreamRef.current;
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    webcamStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    console.log('Webcam stopped');
  } else {
    console.warn('No active webcam to stop');
  }
};



// Face detection loop
// Load the reference face descriptor from stored image
const loadReferenceFaceDescriptor = async () => {
  try {
    const filename = localStorage.getItem('filename');
    if (!filename) throw new Error('No filename found in localStorage');

    const dataUrl = localStorage.getItem('capturedImage');
    if (!dataUrl) throw new Error('No captured image found in localStorage');

    // Create an HTMLImageElement from the base64 string
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
    });

    const detection = await faceapi
      .detectSingleFace(image)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) throw new Error('No face detected in the reference image');

    return detection.descriptor;
  } catch (error) {
    console.error('Error loading reference face descriptor:', error);
    return null;
  }
};


// Main function to start face detection
export const startFaceDetection = async (
  setDetections,
  setAlertCount,
  videoRef,
  userId,
  navigation,
  testName,
  interval = 1000
) => {
  console.log("started face detection");

  const referenceDescriptor = await loadReferenceFaceDescriptor();
  if (!referenceDescriptor) {
    console.warn('Reference face descriptor not available. Face comparison will not start.');
    return;
  }

  // Wait until video is ready
  const waitUntilReady = async () => {
    const MAX_ATTEMPTS = 20;
    let attempts = 0;

    return new Promise((resolve, reject) => {
      const checkReady = () => {
        const video = videoRef.current;
        if (video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          console.log("Video is ready for face detection");
          resolve();
        } else {
          attempts++;
          if (attempts > MAX_ATTEMPTS) {
            reject("Video is not ready after multiple attempts.");
            return;
          }
          setTimeout(checkReady, 300); // retry every 300ms
        }
      };
      checkReady();
    });
  };

  try {
    await waitUntilReady();
  } catch (err) {
    console.error(err);
    return;
  }

  let alertCounter = 0;
  const intervalId = setInterval(async () => {
    try {
      const video = videoRef.current;
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptors();

      setDetections(detections);
      console.log("Detections:", detections.length);

      if (detections.length !== 1) {
        alertCounter++;
        setAlertCount(alertCounter);
        console.warn(`Unexpected number of faces detected: ${detections.length}`);
        alert(`Warning ${alertCounter}: Only one face should be visible!`);

        if (alertCounter === 3) {
          clearInterval(intervalId);
          await handleViolation(userId, navigation, testName);
        }
        return;
      }

      const distance = faceapi.euclideanDistance(detections[0].descriptor, referenceDescriptor);
      const confidence = 1 - distance;

      if (confidence < 0.65) {
        alertCounter++;
        setAlertCount(alertCounter);
        console.warn(`Face mismatch! Confidence: ${confidence.toFixed(2)}`);
        alert(`Warning ${alertCounter}: Face mismatch detected!`);

        if (alertCounter === 3) {
          clearInterval(intervalId);
          await handleViolation(userId, navigation, testName);
        }
      }
    } catch (err) {
      console.error('Error during live face detection:', err);
    }
  }, interval);

  return intervalId;
};

const handleViolation = async (userId, navigation, testName) => {
  if (document.fullscreenElement) {
    try {
      await document.exitFullscreen();
      console.log("Exited fullscreen");
    } catch (err) {
      console.error("Error exiting fullscreen:", err);
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 5000));
  await submitViolation(userId, navigation, testName);
};



// Capture and validate face image
export const captureImage = async (imageSrc, videoRef, userId, onSuccess, onFailure) => {
  console.log("In capture image");
  const video = videoRef.current;
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  if (!video) {
    console.error("videoRef.current is null");
    onFailure("Camera not initialized. Please try again.");
    return;
  }

  if (video.videoWidth === 0 || video.videoHeight === 0) {
    console.error("Video dimensions are zero");
    onFailure("Webcam not ready. Please wait a second and try again.");
    return;
  }

  const ctx = canvas.getContext('2d');
  ctx.filter = 'brightness(1.4) contrast(1.3)';
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg');
  console.log(`Canvas size: ${canvas.width}x${canvas.height}`);
  localStorage.setItem('capturedImage', dataUrl);

  const detections = await faceapi
    .detectAllFaces(canvas)
    .withFaceLandmarks()
    .withFaceDescriptors();
  console.log('with landmarks', detections);
  console.log(detections.length);

  if (detections.length !== 1) {
    onFailure(`Expected exactly one face. Found ${detections.length}. Please retake the image.`);
    return;
  }

  const detection = detections[0];
  console.log('score', detection.detection.score);

  const profileImage = new Image();
  profileImage.src = imageSrc;

  profileImage.onload = async () => {
    const profileCanvas = document.createElement('canvas');
    profileCanvas.width = profileImage.width;
    profileCanvas.height = profileImage.height;

    const profileCtx = profileCanvas.getContext('2d');
    profileCtx.drawImage(profileImage, 0, 0);

    const profileDetection = await faceapi
      .detectSingleFace(profileCanvas)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!profileDetection) {
      onFailure("No face detected in the profile image.");
      return;
    }

    const distance = faceapi.euclideanDistance(
      detection.descriptor,
      profileDetection.descriptor
    );
    const confidence = 1 - distance;

    if (detection.detection.score < 0.9) {
      onFailure('Face not clear. Please retake the image.');
      return;
    }
    console.log(confidence);

    if (confidence < 0.65) {
      onFailure("Face is not matching with the profile image.");
      return;
    }

    const blob = await (await fetch(dataUrl)).blob();
    const timestamp = Date.now();
    const date = new Date(timestamp);

const formatted = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}-${String(date.getSeconds()).padStart(2, '0')}`;

    const filename = `${userId}_${formatted}.jpg`;
    localStorage.setItem('filename', filename);
    const file = new File([blob], filename, { type: 'image/jpeg' });

    onSuccess({ file, dataUrl, filename });
  };
};


// Upload image to server (e.g., to S3)
export const uploadImage = async (file) => {
  const jwtToken = localStorage.getItem('jwtToken');
  const formData = new FormData();
  formData.append('file', file);
 console.log(jwtToken);
  const response = await fetch(`${apiUrl}/file/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwtToken}` },
    body: formData,
  });
  console.log("Imgage uploaded");

  if (!response.ok) throw new Error('Image upload failed');
  return response.text();
};

// Handle verification
export const verifyImage = (capturedImage) => {
  localStorage.setItem('capturedImage', capturedImage);
  console.log('Image verified and stored!');
};

// Submit test violation
 const submitViolation = async (userId, navigation, testName) => {
  const jwtToken = localStorage.getItem('jwtToken');

  const response = await fetch(`${apiUrl}/skill-badges/save`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      applicantId: userId,
      skillBadgeName: testName,
      status: 'FAILED',
    }),
  }
);
console.log("api called");

const contentType = response.headers.get('content-type');
let data;

if (contentType && contentType.includes('application/json')) {
  data = await response.json();
} else {
  data = await response.text();
}
  console.log('Violation submitted:', data);
  
  localStorage.removeItem('filename');
  if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement) {
  document.exitFullscreen();
}
  navigation('/applicant-verified-badges');
 
};
