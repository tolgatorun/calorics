import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Profile() {
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    weight: '',
    height: '',
    neckMeasure: '',
    waistMeasure: '',
    gender: '',
    birthday: '',
    fatPercentage: '',
    goal: 'maintain'
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
      } else {
        navigate('/login');
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
      const updateData = {
        currentWeight: parseInt(profile.weight),
        height: parseInt(profile.height),
        neckMeasurement: parseInt(profile.neckMeasure),
        waistMeasurement: parseInt(profile.waistMeasure),
        goal: profile.goal
      };

      const response = await fetch('http://localhost:8080/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const data = await response.json();
        setMessage('Profile updated successfully!');
        setProfile(prev => ({
          ...prev,
          fatPercentage: data.fatPercentage
        }));
      } else {
        const error = await response.json();
        setMessage('Failed to update profile: ' + error.error);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Error updating profile');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
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
            disabled
          />
        </div>

        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            name="email"
            value={profile.email}
            disabled
          />
        </div>

        <div className="form-group">
          <label>Weight Goal:</label>
          <select
            name="goal"
            value={profile.goal}
            onChange={handleChange}
            required
          >
            <option value="maintain">Maintain Weight</option>
            <option value="lose">Lose Weight</option>
            <option value="gain">Gain Weight</option>
          </select>
        </div>

        <div className="form-group">
          <label>Body Fat Percentage:</label>
          <input
            type="text"
            value={profile.fatPercentage ? `${profile.fatPercentage}%` : 'Not calculated yet'}
            disabled
          />
        </div>

        <div className="form-group">
          <label>Current Weight (kg):</label>
          <input
            type="number"
            name="weight"
            value={profile.weight}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Height (cm):</label>
          <input
            type="number"
            name="height"
            value={profile.height}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Neck Measurement (cm):</label>
          <input
            type="number"
            name="neckMeasure"
            value={profile.neckMeasure}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Waist Measurement (cm):</label>
          <input
            type="number"
            name="waistMeasure"
            value={profile.waistMeasure}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit" className="update-btn">
          Update Profile
        </button>
      </form>

      <button 
        className="logout-btn" 
        onClick={handleLogout}
      >
        Logout
      </button>
    </div>
  );
}

export default Profile;