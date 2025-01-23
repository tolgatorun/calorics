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
  const [weeklyStats, setWeeklyStats] = useState({
    totalCalories: 0,
    averagePercentage: 0
  });

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isFoodEntriesLoading, setIsFoodEntriesLoading] = useState(false);
  const navigate = useNavigate();

  const [macros, setMacros] = useState({
    protein: 0,
    carbs: 0,
    fat: 0
  });

  useEffect(() => {
    fetchUserStats(selectedDate);
    if (selectedDate.getDay() === 0) { // Sunday
      fetchWeeklyStats(selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    // Calculate daily macros from food entries
    if (userStats.foodEntries && userStats.foodEntries.length > 0) {
      const dailyMacros = userStats.foodEntries.reduce((acc, entry) => {
        const protein = (Number(entry.food.protein) * entry.calories) / (entry.food.calories);
        const carbs = (Number(entry.food.carbohydrates) * entry.calories) / (entry.food.calories);
        const fat = (Number(entry.food.fat) * entry.calories) / (entry.food.calories);
        
        return {
          protein: acc.protein + protein,
          carbs: acc.carbs + carbs,
          fat: acc.fat + fat
        };
      }, { protein: 0, carbs: 0, fat: 0 });

      setMacros(dailyMacros);
    } else {
      setMacros({ protein: 0, carbs: 0, fat: 0 });
    }
  }, [userStats.foodEntries]);

  // Calculate macro targets based on body weight - using the middle of the range as target
  const macroTargets = {
    protein: userStats.currentWeight * 1.75, // middle of 1.5-2.0 range
    carbs: userStats.currentWeight * 6.5,    // middle of 6.0-7.0 range
    fat: userStats.currentWeight * 1.15      // middle of 1.0-1.3 range
  };

  const calculateProgress = (current, target) => {
    if (!userStats.foodEntries || userStats.foodEntries.length === 0) {
      return 0;
    }
    return Math.min((current / target) * 100, 100);
  };

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

  const fetchWeeklyStats = async (date) => {
    try {
      const token = localStorage.getItem('token');
      const endDate = date.toISOString().split('T')[0];
      const startDate = new Date(date);
      startDate.setDate(date.getDate() - 6); // Get last 7 days
      const formattedStartDate = startDate.toISOString().split('T')[0];

      const response = await fetch(
        `http://localhost:8080/api/user/weekly-stats?startDate=${formattedStartDate}&endDate=${endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setWeeklyStats(data);
      }
    } catch (error) {
      console.error('Error fetching weekly stats:', error);
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

  const renderProgressBar = () => {
    if (calorieProgress <= 100) {
      // Normal case - single green bar
      return (
        <div className="progress-bar-container">
          <div 
            className="progress-bar" 
            style={{ 
              width: `${calorieProgress}%`,
              backgroundColor: '#4CAF50'
            }}
          >
            <span className="progress-text">
              {Math.round(userStats.dailyCalories)}
            </span>
          </div>
        </div>
      );
    } else {
      // Exceeded case - split bar with green up to 100% and red for excess
      const neededCalories = userStats.neededCalories;
      const exceededCalories = Math.round(userStats.dailyCalories - neededCalories);
      
      return (
        <div className="progress-bar-container split">
          <div 
            className="progress-bar-wrapper"
            style={{ width: '100%' }}
          >
            <div 
              className="progress-bar needed" 
              style={{ 
                width: '100%',
                backgroundColor: '#4CAF50'
              }}
            >
              <span className="progress-text">
                {neededCalories}
              </span>
            </div>
          </div>
          <div 
            className="progress-bar-wrapper"
            style={{ width: `${calorieProgress - 100}%` }}
          >
            <div 
              className="progress-bar exceeded" 
              style={{ 
                width: '100%',
                backgroundColor: '#ff4444'
              }}
            >
              <span className="progress-text">
                +{exceededCalories}
              </span>
            </div>
          </div>
        </div>
      );
    }
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
        <h2>Daily Calories</h2>
        <div className="calorie-progress">
          {renderProgressBar()}
        </div>
        <div className="calorie-numbers">
          <span>{userStats.dailyCalories} / {userStats.neededCalories} kcal</span>
        </div>

        {/* Macro Progress Bars */}
        <div className="macro-progress-section">
          <div className="macro-item">
            <h3>Protein</h3>
            <div className="macro-progress">
              <div 
                className="progress-bar"
                style={{ 
                  width: `${calculateProgress(macros.protein, macroTargets.protein)}%`,
                  backgroundColor: macros.protein > macroTargets.protein ? '#ff4444' : '#4CAF50'
                }}
              ></div>
            </div>
            <div className="macro-numbers">
              <span>{Math.round(macros.protein)} / {Math.round(macroTargets.protein)}g</span>
              <span>{Math.round((macros.protein / macroTargets.protein) * 100)}%</span>
            </div>
          </div>

          <div className="macro-item">
            <h3>Carbs</h3>
            <div className="macro-progress">
              <div 
                className="progress-bar"
                style={{ 
                  width: `${calculateProgress(macros.carbs, macroTargets.carbs)}%`,
                  backgroundColor: macros.carbs > macroTargets.carbs ? '#ff4444' : '#4CAF50'
                }}
              ></div>
            </div>
            <div className="macro-numbers">
              <span>{Math.round(macros.carbs)} / {Math.round(macroTargets.carbs)}g</span>
              <span>{Math.round((macros.carbs / macroTargets.carbs) * 100)}%</span>
            </div>
          </div>

          <div className="macro-item">
            <h3>Fat</h3>
            <div className="macro-progress">
              <div 
                className="progress-bar"
                style={{ 
                  width: `${calculateProgress(macros.fat, macroTargets.fat)}%`,
                  backgroundColor: macros.fat > macroTargets.fat ? '#ff4444' : '#4CAF50'
                }}
              ></div>
            </div>
            <div className="macro-numbers">
              <span>{Math.round(macros.fat)} / {Math.round(macroTargets.fat)}g</span>
              <span>{Math.round((macros.fat / macroTargets.fat) * 100)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Food Entries */}
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
                  <span>{entry.quantity} x {entry.serving_desc}</span>
                  <span>{Math.round(entry.calories)} kcal</span>
                  <span>Protein: {((Number(entry.food.protein) * entry.calories) / (entry.food.calories)).toFixed(1)}g</span>
                  <span>Carbs: {((Number(entry.food.carbohydrates) * entry.calories) / (entry.food.calories)).toFixed(1)}g</span>
                  <span>Fat: {((Number(entry.food.fat) * entry.calories) / (entry.food.calories)).toFixed(1)}g</span>
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

      {/* Weekly Recap - Show only on Sundays */}
      {selectedDate.getDay() === 0 && (
        <div className="stats-card weekly-recap-card">
          <h2>Weekly Recap</h2>
          <div className="weekly-stats">
            <div className="weekly-stat-item">
              <h3>Total Calories This Week</h3>
              <p>{Math.round(weeklyStats.totalCalories)} kcal</p>
            </div>
            <div className="weekly-stat-item">
              <h3>Weekly Percentage of Eaten Foods</h3>
              <p>{Math.round(weeklyStats.averagePercentage)}%</p>
            </div>
          </div>
        </div>
      )}

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

        .calorie-section {
          margin: 10px 0;
        }

        .progress-percentage {
          text-align: center;
          margin-bottom: 5px;
          font-weight: bold;
          color: #333;
        }

        .calorie-progress {
          position: relative;
          width: 100%;
          height: 20px;
          background-color: #f0f0f0;
          border-radius: 10px;
          overflow: hidden;
        }

        .progress-bar-container {
          display: flex;
          width: 100%;
          height: 100%;
        }

        .progress-bar-container.split {
          flex-direction: row;
        }

        .progress-bar {
          height: 100%;
          transition: width 0.3s ease-in-out;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .progress-bar.needed {
          border-radius: 10px 0 0 10px;
        }

        .progress-bar.exceeded {
          border-radius: 0 10px 10px 0;
        }

        .progress-bar-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
        }

        .progress-text {
          color: white;
          font-size: 0.8em;
          font-weight: bold;
          text-shadow: 0 0 2px rgba(0,0,0,0.5);
          z-index: 1;
          white-space: nowrap;
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

        .weekly-recap-card {
          margin: 20px 0;
          padding: 20px;
          background-color: #f8f9fa;
          border: 1px solid #e9ecef;
        }

        .weekly-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 15px;
        }

        .weekly-stat-item {
          text-align: center;
          padding: 15px;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .weekly-stat-item h3 {
          margin: 0 0 10px 0;
          font-size: 1em;
          color: #666;
        }

        .weekly-stat-item p {
          margin: 0;
          font-size: 1.5em;
          font-weight: bold;
          color: #4CAF50;
        }

        .macro-progress-section {
          margin-top: 20px;
        }

        .macro-item {
          margin-bottom: 20px;
        }

        .macro-progress {
          position: relative;
          width: 100%;
          height: 20px;
          background-color: #f0f0f0;
          border-radius: 10px;
          overflow: hidden;
        }

        .macro-progress .progress-bar {
          height: 100%;
          transition: width 0.3s ease-in-out;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .macro-numbers {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 8px;
          font-size: 0.9em;
          color: #666;
        }

        .macro-numbers span:first-child {
          color: #333;
          font-weight: 500;
        }

        .macro-numbers span:last-child {
          color: #333;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}

export default Dashboard;