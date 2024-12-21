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

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isFoodEntriesLoading, setIsFoodEntriesLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserStats(selectedDate);
  }, [selectedDate]);

  const fetchUserStats = async (date) => {
    setIsFoodEntriesLoading(true);
    try {
      const token = localStorage.getItem('token');
      const formattedDate = date.toISOString().split('T')[0];
      const response = await fetch(`http://localhost:8080/api/user/stats?date=${formattedDate}`, {
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
      setIsFoodEntriesLoading(false);
    }
  };

  const handleDeleteFoodEntry = async (entryId) => {
    if (!window.confirm('Are you sure you want to delete this food entry?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8080/api/food-entries/${entryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Update the UI by removing the deleted entry
        setUserStats(prev => ({
          ...prev,
          foodEntries: prev.foodEntries.filter(entry => entry.ID !== entryId),
          dailyCalories: prev.dailyCalories - prev.foodEntries.find(entry => entry.ID === entryId).calories
        }));
      } else {
        console.error('Failed to delete food entry');
      }
    } catch (error) {
      console.error('Error deleting food entry:', error);
    }
  };

  const changeDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
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
      
      {/* Date Navigation */}
      <div className="date-navigation">
        <button onClick={() => changeDate(-1)}>&lt;</button>
        <h2>{formatDate(selectedDate)}</h2>
        <button onClick={() => changeDate(1)}>&gt;</button>
      </div>

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

      {/* Today's Food Entries - Update the title */}
      <div className="stats-card food-entries-card">
        <h2>Foods for {selectedDate.toDateString()}</h2>
        {isFoodEntriesLoading ? (
          <div className="loading-spinner">Loading food entries...</div>
        ) : userStats.foodEntries && userStats.foodEntries.length > 0 ? (
          <div className="food-entries-list">
            {userStats.foodEntries.map((entry) => (
              <div key={entry.ID} className="food-entry-item">
                <div className="food-entry-name">{entry.food?.name || 'Unknown Food'}</div>
                <div className="food-entry-details">
                  <span>{entry.quantity} × {entry.serving_desc}</span>
                  <span>{Math.round(entry.calories)} kcal</span>
                  <button 
                    className="delete-entry-btn"
                    onClick={() => handleDeleteFoodEntry(entry.ID)}
                  >
                    ×
                  </button>
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
          gap: 15px;
          align-items: center;
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

        .delete-entry-btn {
          background: none;
          border: none;
          color: #ff4d4d;
          font-size: 1.2em;
          cursor: pointer;
          padding: 0 5px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          transition: background-color 0.2s;
        }

        .delete-entry-btn:hover {
          background-color: rgba(255, 77, 77, 0.1);
        }

        .no-foods {
          text-align: center;
          color: #666;
          margin: 20px 0;
        }

        .date-navigation {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          margin: 20px 0;
        }

        .date-navigation button {
          padding: 8px 16px;
          font-size: 1.2em;
          background-color: #4CAF50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.3s;
        }

        .date-navigation button:hover {
          background-color: #45a049;
        }

        .date-navigation h2 {
          margin: 0;
          min-width: 300px;
          text-align: center;
        }

        .loading-spinner {
          text-align: center;
          padding: 20px;
          color: #666;
        }
      `}</style>
    </div>
  );
}

export default Dashboard;