import { useState, useEffect } from 'react';
import axios from 'axios';
import { apiUrl } from '../../services/ApplicantAPIService';
import { useUserContext } from '../common/UserProvider';
import { Link } from "react-router-dom";

export default function ApplicantJobAlerts() {
  const [jobAlerts, setJobAlerts] = useState([]);
  const { user } = useUserContext();

  useEffect(() => {
    const fetchJobAlerts = async () => {
      try {
        const authToken = localStorage.getItem('jwtToken');
        const response = await axios.get(
          `${apiUrl}/applyjob/applicant/job-alerts/${user.id}`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );
        const alerts = response.data;
        console.log(alerts)
        setJobAlerts(alerts);
      } catch (error) {
        console.error('Error fetching job alerts:', error);
      }
    };
    fetchJobAlerts();
  }, [user.id]);

  const handleDeleteAlert = async (alertId) => {
    try {
      const authToken = localStorage.getItem('jwtToken');
      await axios.delete(`${apiUrl}/applyjob/alert/delete/${alertId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      setJobAlerts(prevAlerts => prevAlerts.filter(alert => alert.alertsId !== alertId));
    } catch (error) {
      console.error("Error deleting alert:", error);
    }
  };

  const handleJobAlertClick = async (alert) => {
    try {

      await axios.put(`${apiUrl}/applyjob/applicant/mark-alert-as-seen/${alert.alertsId}`);

      const updatedJobAlerts = jobAlerts.map(item => {
        if (item.alertsId === alert.alertsId) {
          return { ...item, seen: true };
        }
        return item;
      });
      setJobAlerts(updatedJobAlerts);
    } catch (error) {
      console.error('Error marking alert as seen:', error);
    }
  };

  function formatDate(dateArray) {
    const [year, month, day, hour, minute, second] = dateArray;
    const date = new Date(year, month - 1, day, hour, minute, second);
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };
    const formattedDate = date.toLocaleString('en-US', options);
    return formattedDate;
  }

  return (
    <div className="dashboard__content">
      <section className="page-title-dashboard">
        <div className="themes-container">
          <div className="row">
            <div className="col-lg-12 col-md-12">
              <div className="title-dashboard">
                <div className="title-dash flex2" style={{ marginLeft: "30px", marginBottom: "-30px" }}>Notifications</div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="flat-dashboard-dyagram">
        <div className="box-icon wrap-counter flex">
          <div className="icon style1">
            <span className="icon-bag"></span>
          </div>
          <div className="content">
          </div>
        </div>
        <div className="themes-container">
          <div className="row">
            <div className="col-lg-12 col-md-12">

              <div className="box-notifications">

                {jobAlerts.length > 0 ? (
                  <ul>
                    {jobAlerts.map(alert => (
                      <li
                        key={alert.alertsId}
                        className="inner"
                        style={{
                          width: '100%',
                          padding: '2%',
                          borderRadius: '10px',
                          height: '100px',
                          position: 'relative',
                          backgroundColor: alert.seen ? '#E5EAF5' : '#FFFFFF'
                        }}
                      >
                        <button
                          onClick={() => handleJobAlertClick(alert)}
                          style={{
                            all: 'unset'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', position: 'relative', height: '50px' }}>
                            <div
                              style={{
                                width: '10px',
                                height: '10px',
                                backgroundColor: alert.seen ? 'transparent' : '#3384E3',
                                border: '2px solid #3384E3',
                                borderRadius: '50%',
                                marginRight: '10px',
                                position: 'absolute',
                                left: '0px',
                                top: '20px',
                              }}
                            ></div>
                            <h4 style={{ marginLeft: '25px' }}>

                              <Link
                                to={`/applicant-interview-status?jobId=${alert.jobId}&applyJobId=${alert.applyjobid}`}
                                className="link"
                                onMouseOver={(e) => { e.target.style.color = 'black'; }}
                                onMouseOut={(e) => { e.target.style.color = 'black'; }}
                              >
                                Your application status has been marked as &nbsp;{alert.status} {' '} by {alert.companyName} for {' '} {alert.jobTitle} {' '} role {' '}.
                                <br /> {/* Line break to move the date to the second line */}
                                <span className="date-info">
                                  {formatDate(alert.changeDate)}
                                </span>
                              </Link>
                            </h4>
                            <button
                              style={{ all: 'unset', marginLeft: '30px', cursor: 'pointer', color: 'red', fontWeight: 'bold' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleDeleteAlert(alert.alertsId);
                              }}
                            >
                              <i className="fas fa-trash"></i>
                            </button>

                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <h3>No alerts are found.</h3>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
