'use client';
import React, { useState, useEffect } from 'react';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';

interface CalendarPickerProps {
  value: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
}

const CalendarPicker: React.FC<CalendarPickerProps> = ({ value, onChange, onClose }) => {
  const [displayDate, setDisplayDate] = useState(new Date(value));
  const [selectedHour, setSelectedHour] = useState(value.getHours());
  const [selectedMinute, setSelectedMinute] = useState(value.getMinutes());

  useEffect(() => {
    // When the value prop changes from outside, update the internal state
    setDisplayDate(new Date(value));
    setSelectedHour(value.getHours());
    setSelectedMinute(value.getMinutes());
  }, [value]);

  const handleMonthChange = (offset: number) => {
    setDisplayDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + offset);
      return newDate;
    });
  };

  const handleDateSelect = (day: number) => {
    const newDate = new Date(displayDate);
    newDate.setDate(day);
    newDate.setHours(selectedHour);
    newDate.setMinutes(selectedMinute);
    onChange(newDate);
  };
  
  const handleTimeChange = (type: 'hour' | 'minute', val: number) => {
      if (type === 'hour') {
          setSelectedHour(val);
          const newDate = new Date(value);
          newDate.setHours(val);
          onChange(newDate);
      } else {
          setSelectedMinute(val);
          const newDate = new Date(value);
          newDate.setMinutes(val);
          onChange(newDate);
      }
  }

  const renderCalendarGrid = () => {
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected =
        day === value.getDate() &&
        month === value.getMonth() &&
        year === value.getFullYear();
      
      const isToday = 
        day === new Date().getDate() &&
        month === new Date().getMonth() &&
        year === new Date().getFullYear();

      const baseClasses = "w-10 h-10 flex items-center justify-center rounded-full cursor-pointer";
      let dayClasses = `${baseClasses} hover:bg-blue-100`;

      if (isSelected) {
        dayClasses = `${baseClasses} bg-blue-600 text-white font-bold`;
      } else if (isToday) {
        dayClasses = `${baseClasses} bg-slate-200 text-slate-800 font-semibold`;
      } else {
        dayClasses = `${baseClasses} text-slate-700 hover:bg-blue-100`;
      }

      days.push(
        <div key={day} className="flex justify-center">
            <button
              type="button"
              onClick={() => handleDateSelect(day)}
              className={dayClasses}
            >
              {day}
            </button>
        </div>
      );
    }
    return days;
  };

  const monthNames = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];
  const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <button type="button" onClick={() => handleMonthChange(-1)} className="p-2 rounded-full hover:bg-slate-100"><ChevronLeftIcon /></button>
                <div className="font-bold text-lg text-slate-800">
                    {monthNames[displayDate.getMonth()]} {displayDate.getFullYear()}
                </div>
                <button type="button" onClick={() => handleMonthChange(1)} className="p-2 rounded-full hover:bg-slate-100"><ChevronRightIcon /></button>
            </div>

            {/* Calendar */}
            <div className="grid grid-cols-7 gap-y-2 text-center">
                {dayNames.map(day => <div key={day} className="font-semibold text-sm text-slate-500">{day}</div>)}
                {renderCalendarGrid()}
            </div>

            {/* Time Picker */}
            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-center gap-4">
                <label className="font-semibold text-slate-700">Thời gian:</label>
                <select 
                    value={selectedHour} 
                    onChange={e => handleTimeChange('hour', parseInt(e.target.value, 10))}
                    className="p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500"
                >
                    {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                        <option key={hour} value={hour}>{String(hour).padStart(2, '0')}</option>
                    ))}
                </select>
                <span>:</span>
                 <select 
                    value={selectedMinute} 
                    onChange={e => handleTimeChange('minute', parseInt(e.target.value, 10))}
                    className="p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500"
                >
                    {Array.from({ length: 60 }, (_, i) => i).map(minute => (
                        <option key={minute} value={minute}>{String(minute).padStart(2, '0')}</option>
                    ))}
                </select>
            </div>
            
            {/* Close Button */}
            <div className="mt-6 text-center">
                 <button 
                    type="button" 
                    onClick={onClose} 
                    className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700"
                 >
                    Xong
                </button>
            </div>
        </div>
    </div>
  );
};

export default CalendarPicker;
