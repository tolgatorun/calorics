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
    age: 0,
    goal: 'maintain',
    foodEntries: []
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
        console.log('Food entries:', data.foodEntries);
        if (data.foodEntries) {
          data.foodEntries.forEach((entry, index) => {
            console.log(`Food entry ${index}:`, entry);
            console.log(`Food details for entry ${index}:`, entry.food);
          });
        }
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
  
  const getProgressBarColor = (progress) => {
    if (progress >= 100) return '#ff4d4d'; // Red for exceeding goal
    if (progress >= 80) return '#ffa500';  // Orange for close to goal
    return '#4CAF50';  // Default green
  };

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
      <h1>Calorics Daily Progress</h1>
      
      {/* Calorie Progress Section */}
      <div className="stats-card calorie-card">
        <h2>Calories</h2>
        <div className="calorie-progress">
          <div 
            className="progress-bar" 
            style={{ 
              width: `${Math.min(calorieProgress, 100)}%`,
              backgroundColor: getProgressBarColor(calorieProgress)
            }}
          />
        </div>
        <div className="calorie-numbers">
          <span>{userStats.dailyCalories} kcal</span>
          <span>of</span>
          <span>{userStats.neededCalories} kcal</span>
        </div>
      </div>

      {/* Today's Food Entries */}
      <div className="stats-card food-entries-card">
        <h2>Today's Foods</h2>
        {userStats.foodEntries && userStats.foodEntries.length > 0 ? (
          <div className="food-entries-list">
            {userStats.foodEntries.map((entry) => (
              <div key={entry.ID} className="food-entry-item">
                <div className="food-entry-name">{entry.food?.name || 'Unknown Food'}</div>
                <div className="food-entry-details">
                  <span>{entry.quantity} × {entry.serving_desc}</span>
                  <span>{Math.round(entry.calories)} kcal</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-foods">No foods logged today</p>
        )}
      </div>

      {/* Measurements Section */}
      <div className="measurements-grid">
        <div className="stats-card">
          <h3>Current Weight</h3>
          <p>{userStats.currentWeight} kg</p>
        </div>
        <div className="stats-card">
          <h3>Age</h3>
          <p>{userStats.age} years</p>
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

      <style jsx>{`
        .food-entries-card {
          margin: 20px 0;
          padding: 20px;
        }

        .calorie-card {
          padding: 20px;
          margin-bottom: 20px;
        }

        .calorie-progress {
          width: 100%;
          height: 20px;
          background-color: #f0f0f0;
          border-radius: 10px;
          overflow: hidden;
          margin: 10px 0;
          position: relative;
        }

        .progress-bar {
          height: 100%;
          transition: width 0.3s ease-in-out;
          border-radius: 10px;
        }

        .calorie-numbers {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 8px;
          font-size: 0.9em;
          color: #666;
        }

        .calorie-numbers span:first-child {
          color: #333;
          font-weight: 500;
        }

        .calorie-numbers span:last-child {
          color: #333;
          font-weight: 500;
        }

        .food-entries-list {
          margin-top: 15px;
        }

        .food-entry-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #eee;
        }

        .food-entry-item:last-child {
          border-bottom: none;
        }

        .food-entry-name {
          font-weight: 500;
          flex: 1;
          margin-right: 15px;
        }

        .food-entry-details {
          display: flex;
          gap: 20px;
          color: #666;
          font-size: 0.95em;
          white-space: nowrap;
        }

        .food-entry-details span:first-child {
          min-width: 120px;
          text-align: right;
        }

        .food-entry-details span:last-child {
          min-width: 80px;
          text-align: right;
          font-weight: 500;
          color: #333;
        }

        .no-foods {
          text-align: center;
          color: #666;
          margin: 20px 0;
        }
      `}</style>
    </div>
  );
}

export default Dashboard;