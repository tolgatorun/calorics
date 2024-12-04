import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const [userStats, setUserStats] = useState({
    dailyCalories: 0,
    neededCalories: 2000,
    currentWeight: 0,
    neckMeasurement: 0,
    waistMeasurement: 0,
    fatPercentage: 0,
    goal: 'maintain'
  });

  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch user stats when component mounts
    fetchUserStats();
  }, []);

  const fetchUserStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/user/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Raw stats data:', data);
        setUserStats(data);
      } else {
        navigate('/login');
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFoodRegister = () => {
    navigate('/food-register');
  };

  const getGoalText = (goal) => {
    switch(goal) {
      case 'lose':
        return 'Lose Weight';
      case 'gain':
        return 'Gain Weight';
      default:
        return 'Maintain Weight';
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const calorieProgress = (userStats.dailyCalories / userStats.neededCalories) * 100;
  const handleProfileClick = () => {
    navigate('/profile');
  };
  return (
    <div className="dashboard-container">
        <div className="dashboard-header">
    <button 
      className="profile-btn"
        onClick={handleProfileClick}
        >
          Profile
        </button>
      </div>
      <h1>Daily Progress</h1>
      
      {/* Calorie Progress Section */}
      <div className="stats-card calorie-card">
        <h2>Calories</h2>
        <div className="calorie-progress">
          <div 
            className="progress-bar" 
            style={{ width: `${Math.min(calorieProgress, 100)}%` }}
          />
        </div>
        <div className="calorie-numbers">
          <span>{userStats.dailyCalories} kcal</span>
          <span>of</span>
          <span>{userStats.neededCalories} kcal</span>
        </div>
      </div>

      {/* Measurements Section */}
      <div className="measurements-grid">
        <div className="stats-card">
          <h3>Current Weight</h3>
          <p>{userStats.currentWeight} kg</p>
        </div>
        <div className="stats-card">
          <h3>Neck</h3>
          <p>{userStats.neckMeasurement} cm</p>
        </div>
        <div className="stats-card">
          <h3>Waist</h3>
          <p>{userStats.waistMeasurement} cm</p>
        </div>
        <div className="stats-card">
          <h3>Body Fat</h3>
          <p>{userStats.fatPercentage !== undefined && userStats.fatPercentage !== null 
              ? `${userStats.fatPercentage}%` 
              : 'Not calculated'}</p>
        </div>
        <div className="stats-card">
          <h3>Goal</h3>
          <p>{getGoalText(userStats.goal)}</p>
        </div>
      </div>

      {/* Food Register Button */}
      <button 
        className="food-register-btn"
        onClick={handleFoodRegister}
      >
        Register Food
      </button>

      <button 
        className="logout-btn" 
        onClick={() => {
          localStorage.removeItem('token');
          navigate('/login');
        }}
      >
        Logout
      </button>
    </div>
  );
}

export default Dashboard;