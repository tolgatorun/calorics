import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Profile() {
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    currentWeight: '',
    neckMeasurement: '',
    waistMeasurement: '',
    gender: '',
    birthday: ''
  });

  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profile)
      });

      if (response.ok) {
        setMessage('Profile updated successfully!');
      } else {
        setMessage('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Error updating profile');
    }
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <button className="back-btn" onClick={handleBackToDashboard}>
          Back to Dashboard
        </button>
        <h1>Profile</h1>
      </div>

      {message && <div className="message">{message}</div>}

      <form onSubmit={handleSubmit} className="profile-form">
        <div className="form-group">
          <label>Name:</label>
          <input
            type="text"
            name="name"
            value={profile.name}
            onChange={handleChange}
            disabled  // Name can't be changed
          />
        </div>

        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            name="email"
            value={profile.email}
            onChange={handleChange}
            disabled  // Email can't be changed
          />
        </div>

        <div className="form-group">
          <label>Current Weight (kg):</label>
          <input
            type="number"
            step="0.1"
            name="currentWeight"
            value={profile.currentWeight}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Neck Measurement (cm):</label>
          <input
            type="number"
            step="0.1"
            name="neckMeasurement"
            value={profile.neckMeasurement}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Waist Measurement (cm):</label>
          <input
            type="number"
            step="0.1"
            name="waistMeasurement"
            value={profile.waistMeasurement}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit" className="update-btn">
          Update Profile
        </button>
      </form>
    </div>
  );
}

export default Profile;