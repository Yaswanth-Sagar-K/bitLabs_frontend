import { useState, useEffect, useRef } from 'react';
import "./InterviewAI.css";
import micping from '../../images/mic-icon.png';
import { useLocation } from 'react-router-dom';
import { apiUrl } from '../../services/ApplicantAPIService';
import axios from 'axios';
import { useUserContext } from '../common/UserProvider';

const InterviewAI = () => {
  const location = useLocation();
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null);
  const [jobDetails, setJobDetails] = useState(null);
  const jobId = new URLSearchParams(location.search).get('jobId');
  const { user } = useUserContext();
  const userId = user.id;
  const [answer, setAnswer] = useState(null);
  const [displayData, setDisplayData] = useState([]);

  const recognitionRef = useRef(null);
  const graceTimeout = useRef(null);
  const waitForSpeechTimeout = useRef(null);

  useEffect(() => {
    const fetchJobDetails = async () => {
      try {
        const jwtToken = localStorage.getItem('jwtToken');
        const response = await axios.get(
          `${apiUrl}/viewjob/applicant/viewjob/${jobId}/${userId}`,
          {
            headers: {
              Authorization: `Bearer ${jwtToken}`,
            },
          }
        );
        const { body } = response.data;
        if (body) {
          setJobDetails(body);
        }
      } catch (error) {
        console.error('Error fetching job details:', error);
      }
    };
    fetchJobDetails();
  }, [jobId, userId]);

  const handleInterview = async () => {
    try {
      const jwtToken = localStorage.getItem('jwtToken');
      const response = await axios.post(`${apiUrl}/AiInterview/history`, {
        job: jobDetails,
        history: history
      }, {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
        }
      });

      const { question } = response.data;
      console.log(response.data);
      console.log(question)
      if (response.data.isInterviewOver === 'true') {
        console.log("returning");
        return;
      }
      setDisplayData(prev => [
    ...prev,
    { question, answer: null }  // Add question with empty answer
  ]);

      setResult(response.data);
      // Delay 1.5s before starting voice capture
      setTimeout(() => {
        startVoiceCapture(question);
      }, 1500);
    } catch (error) {
      console.error('Error during interview process:', error);
    }
  };

 const speakQuestion = (text, callback) => {
  const synth = window.speechSynthesis;
  const voices = synth.getVoices();

  const selectedVoice = voices.find(voice =>
    voice.lang === 'en-US' && voice.name.includes('Female')
  ) || voices.find(voice => voice.lang === 'en-US') || voices[0];

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.voice = selectedVoice;

  utterance.onend = () => {
    setTimeout(() => {
      callback();
    }, 1500);
  };

  synth.speak(utterance);
};


  const startVoiceCapture = (question) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    // Step 1: Speak the question before listening
    speakQuestion(question, () => {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      let finalTranscript = '';
      let userStartedTalking = false;

      recognitionRef.current = recognition;

      recognition.onstart = () => {
        console.log("Listening...");
        waitForSpeechTimeout.current = setTimeout(() => {
          if (!userStartedTalking) {
            recognition.stop();
            updateHistoryAndContinue(question, null);
          }
        }, 10000); // 10 seconds max wait
      };

      recognition.onresult = (event) => {
        clearTimeout(graceTimeout.current);
        clearTimeout(waitForSpeechTimeout.current);
        userStartedTalking = true;

        finalTranscript += event.results[0][0].transcript;

        // Start grace timeout of 2s to end recognition after silence
        graceTimeout.current = setTimeout(() => {
          recognition.stop();
          updateHistoryAndContinue(question, finalTranscript);
        }, 2000);
      };

      recognition.onerror = (e) => {
        console.error('Speech recognition error:', e);
        clearTimeout(waitForSpeechTimeout.current);
        clearTimeout(graceTimeout.current);
        updateHistoryAndContinue(question, null);
      };

      recognition.onend = () => {
        console.log("Recognition ended");
      };

      recognition.start();
    });
  };


  const updateHistoryAndContinue = (question, answer) => {
    setAnswer(answer || "no answer provided");
     setDisplayData(prev => {
    const updated = [...prev];
    
    if (updated.length > 0) {
      updated[updated.length - 1].answer = answer || "No answer provided";
    }

    return updated;
  });
    const newEntry = {
      question,
      answer: answer || null
    };
    setHistory(prev => [...prev, newEntry]);
    console.log(history);
  };

  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current && history.length > 0) {
      handleInterview();
    } else {
      startedRef.current = true;
    }
  }, [history]);


  return (
    <div>
      <div className="container1">
        <div className="left-box">
          <div className="mic-container">
            <span className="wave wave1"></span>
            <span className="wave wave2"></span>
            <span className="wave wave3"></span>
            <img src={micping} alt="Mic" className="mic-icon" />
          </div>

          <div className="bottom-buttons">
            <button className="btn1" onClick={handleInterview}>
              Start
            </button>
          </div>
        </div>

        <div className="right-box">
  {result && (
    <>
      {displayData.map((item, index) => (
        <div key={index} className="message-wrapper">
          <div className="ai-question">{item.question}</div>
          {item.answer && (
            <div className="user-answer">{item.answer}</div>
          )}
        </div>
      ))}
    </>
  )}
</div>

      </div>
    </div>
  );
};

export default InterviewAI;