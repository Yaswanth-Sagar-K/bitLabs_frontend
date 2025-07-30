import { useState, useEffect } from 'react';
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
    const [jobDetails, setJobDetails] = useState(null)
     const jobId = new URLSearchParams(location.search).get('jobId');
     const { user } = useUserContext();

     useEffect(() => {
        const fetchJobDetails = async () => {
            console.log(jobId);
          try {
             const jwtToken = localStorage.getItem('jwtToken')
            const response = await axios.get(
              `${apiUrl}/viewjob/applicant/viewjob/${jobId}/${user.id}`,
              {
                headers: {
                  Authorization: `Bearer ${jwtToken}`,
                },
              }
            );
    
            const { body } = response.data;
            if (body) {
      setJobDetails(body);
      console.log(body);
    }
          } catch (error) {
            console.error('Error fetching job details:', error);
          } 
        };
    
        fetchJobDetails();
      }, [jobId]);

    const handleInterview = async () => {
        console.log(jobDetails);
         const jwtToken = localStorage.getItem('jwtToken')
        const response = await axios.post(`${apiUrl}/AiInterview/history`,
             {
                job : jobDetails,
                history : history
            },{
            headers: {
                Authorization: `Bearer ${jwtToken}`,
            }
           
    })
        console.log(response.data);

    }


    return (
        <div class="container1">
            <div class="left-box">
                <div className="mic-container">
                    <span className="wave wave1"></span>
                    <span className="wave wave2"></span>
                    <span className="wave wave3"></span>
                    <img src={micping} alt="Mic" className="mic-icon" />
                </div>
                <div className="bottom-buttons">
                    <button className="btn1"
                        onClick={handleInterview}>
                        Start
                    </button>
                </div>

            </div>
            <div class="right-box"></div>
        </div>
    )
}

export default InterviewAI;