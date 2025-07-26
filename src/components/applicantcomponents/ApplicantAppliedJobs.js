import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../../services/ApplicantAPIService';
import { useUserContext } from '../common/UserProvider';
import './ApplicantFindJobs.css';
import PropTypes from 'prop-types';

function ApplicantAppliedJobs({ setSelectedJobId }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUserContext();
  const applicantId = user.id;
  const navigate = useNavigate();
  const pageSize = 10;
  const [pageNum, setPageNum] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const handlePreviousPage = () => {
    if (pageNum > 0) setPageNum((prev) => prev - 1);
  };

  const handleNextPage = () => {
    if (pageNum < totalPages - 1) setPageNum((prev) => prev + 1);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const jwtToken = localStorage.getItem('jwtToken');
        const countRes = await axios.get(`${apiUrl}/applyjob/countAppliedJobs/${applicantId}`,
          {
            headers: {
              Authorization: `Bearer ${jwtToken}`,
            },
          }
        );
        const totalJobs = countRes.data || 0;
        setTotalPages(Math.ceil(totalJobs / pageSize));

        const jobsRes = await axios.get(
          `${apiUrl}/applyjob/getAppliedJobs/${applicantId}?page=${pageNum}&size=${pageSize}`,
          {
            headers: {
              Authorization: `Bearer ${jwtToken}`,
            },
          }
        );
        setJobs(jobsRes.data);
      } catch (error) {
        console.error('Error loading applied jobs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [pageNum]);

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };
  const handleCheckStatusClick = (jobId, applyJobId) => {
    setSelectedJobId(applyJobId);
    navigate(`/applicant-interview-status?jobId=${jobId}&applyJobId=${applyJobId}`);
  };

  const convertToLakhs = (amountInRupees) => {
    return (amountInRupees * 1).toFixed(2);
  };

  return (
    <div>
      {loading ? null : (
        <div className="dashboard__content">
          {/* Job List */}
          <div className="row mr-0 ml-10">
            <div className="col-lg-12 col-md-12">
              <section className="page-title-dashboard">
                <div className="themes-container">
                  <div className="title-dashboard">
                    <div className="title-dash flex2">My Applied Jobs</div>
                  </div>
                </div>
              </section>
            </div>
            <div className="col-lg-12 col-md-12">
              <section className="flat-dashboard-setting flat-dashboard-setting2">
                <div className="themes-container">
                  <div className="content-tab">
                    <div className="inner">
                      <div className="group-col-2">
                        {jobs.length === 0 ? (
                          <div style={{ marginLeft: 30 }}>No Applied jobs available</div>
                        ) : (
                          jobs.map((job) => (
                            <div className="features-job cl2 bg-white" key={job.id}>
                              <div className="job-archive-header">
                                <div className="inner-box">
                                  <div className="box-content">
                                    <h4>
                                      <p>{job.companyname}</p>
                                    </h4>
                                    <h3>{job.jobTitle}</h3>
                                    <ul>
                                      <li>
                                        <span className="icon-map-pin"></span>&nbsp;{job.location}
                                      </li>
                                    </ul>
                                  </div>
                                </div>
                              </div>
                              <div className="job-archive-footer">
                                <div className="job-footer-left">
                                  <ul className="job-tag">
                                    <li>
                                      <p>{job.employeeType}</p>
                                    </li>
                                    <li>
                                      <p>
                                        {job.remote ? 'Remote' : 'Office-based'}
                                      </p>
                                    </li>
                                    <li>
                                      <p>
                                        Exp &nbsp;{job.minimumExperience} - {job.maximumExperience} years
                                      </p>
                                    </li>
                                    <li>
                                      <p>&#x20B9; {convertToLakhs(job.minSalary)} - &#x20B9; {convertToLakhs(job.maxSalary)} LPA</p>
                                    </li>
                                  </ul>
                                </div>
                                <div className="job-footer-right" >
                                  <div className="price">
                                    <span style={{ fontSize: '12px' }}>Posted on {formatDate(job.creationDate)}</span>
                                  </div>
                                  <button
                                    className="button-status"
                                    onClick={() => handleCheckStatusClick(job.id, job.applyJobId)}

                                  >
                                    Check Status
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Pagination */}

                    <div className="pagination" style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px", gap: "10px" }}>
                      <button
                        onClick={handlePreviousPage}
                        className="arrow-button"
                        disabled={pageNum === 0}
                        style={pageNum === 0 ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                      >
                        <span aria-hidden="true">&lsaquo;</span> {/* Left Arrow */}
                      </button>

                      {/* Page Numbers */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1) // Map backend 0-indexed to frontend 1-indexed
                        .filter((pageNumber) => {
                          return (
                            pageNumber <= 1 || // Show first page
                            pageNumber === totalPages || // Show last page
                            (pageNumber >= pageNum + 1 && pageNumber <= pageNum + 3) // Show pages near the current page
                          );
                        })
                        .reduce((acc, pageNumber, index, array) => {
                          const prev = array[index - 1];
                          if (index > 0 && pageNumber !== prev + 1) {
                            acc.push(`ellipsis-${prev}-${pageNumber}`);
                          }
                          acc.push(pageNumber);
                          return acc;
                        }, [])
                        .map((item) =>
                          typeof item === "string" && item.startsWith("ellipsis") ? (
                            <span key={item} style={{ padding: "0 5px" }}>...</span>
                          ) : (
                            <button
                              key={`page-${item}`}
                              onClick={() => setPageNum(item - 1)} // 0-indexed for backend
                              className={pageNum === item - 1 ? "active" : ""}
                              style={{ marginBottom: "5px" }}
                            >
                              {item}
                            </button>
                          )
                        )}

                      <button
                        onClick={handleNextPage}
                        className="arrow-button"
                        disabled={pageNum === totalPages - 1}
                        style={pageNum === totalPages - 1 ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                      >
                        <span aria-hidden="true">&rsaquo;</span> {/* Right Arrow */}
                      </button>
                    </div>

                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

ApplicantAppliedJobs.propTypes = {
  setSelectedJobId: PropTypes.func.isRequired,
};

export default ApplicantAppliedJobs;
