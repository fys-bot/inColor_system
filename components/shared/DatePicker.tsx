
import React, { useState, useEffect, useRef } from 'react';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from './Icons';

type DateRange = {
  start: Date | null;
  end: Date | null;
};

interface DatePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const presets = [
  { label: '今日', days: 0 },
  { label: '昨日', days: 1, subtract: true },
  { label: '过去7天', days: 6 },
];

const DatePicker: React.FC<DatePickerProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange>(value);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  
  const today = new Date();
  const [leftMonth, setLeftMonth] = useState(new Date(today.getFullYear(), today.getMonth() -1, 1));
  const [rightMonth, setRightMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setTempRange(value); // Reset changes if closed without applying
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [wrapperRef, value]);

  const handleApply = () => {
    onChange(tempRange);
    setIsOpen(false);
  };

  const handleDateClick = (day: Date) => {
    const { start, end } = tempRange;
    if (!start || end) {
      setTempRange({ start: day, end: null });
    } else if (day < start) {
      setTempRange({ start: day, end: start });
    } else {
      setTempRange({ start, end: day });
    }
  };

  const handlePresetClick = (preset: typeof presets[0]) => {
    let end = new Date();
    end.setHours(23, 59, 59, 999);
    let start = new Date();
    start.setHours(0, 0, 0, 0);

    if (preset.days !== undefined) {
      if (preset.subtract) {
        start.setDate(start.getDate() - preset.days);
        end.setDate(end.getDate() - preset.days);
      } else {
        start.setDate(start.getDate() - preset.days);
      }
    }
    setTempRange({ start, end });
  };
  
  const moveMonth = (offset: number) => {
    setLeftMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    setRightMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };
  
  const moveYear = (offset: number) => {
    setLeftMonth(prev => new Date(prev.getFullYear() + offset, prev.getMonth(), 1));
    setRightMonth(prev => new Date(prev.getFullYear() + offset, prev.getMonth(), 1));
  };
  
  const Calendar = ({ monthDate }: { monthDate: Date }) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const days = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));
    const blanks = Array.from({ length: firstDayIndex }, (_, i) => i);
    
    // Normalize today for comparison (end of today)
    const maxAllowedDate = new Date();
    maxAllowedDate.setHours(23, 59, 59, 999);

    return (
      <div className="w-64">
        <div className="grid grid-cols-7 text-center text-xs text-gray-500 mb-2">
          {['日', '一', '二', '三', '四', '五', '六'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 text-center text-sm">
          {blanks.map(b => <div key={`blank-${b}`}></div>)}
          {days.map(day => {
            const dayStr = day.toISOString().split('T')[0];
            const startStr = tempRange.start?.toISOString().split('T')[0];
            const endStr = tempRange.end?.toISOString().split('T')[0];
            const hoverStr = hoverDate?.toISOString().split('T')[0];
            
            const isDisabled = day > maxAllowedDate;

            const isStart = dayStr === startStr;
            const isEnd = dayStr === endStr;
            const isBetween = tempRange.start && tempRange.end && day > tempRange.start && day < tempRange.end;
            const isHoveringBetween = tempRange.start && !tempRange.end && hoverDate && day > tempRange.start && day <= hoverDate;

            let className = "h-8 w-8 flex items-center justify-center rounded-full text-sm";
            
            if (isDisabled) {
                className += " text-gray-300 cursor-not-allowed";
            } else {
                className += " cursor-pointer";
                if(isStart || isEnd) className += " bg-blue-500 text-white";
                else if(isBetween || isHoveringBetween) className += " bg-blue-100 rounded-none";
                else className += " hover:bg-gray-100";
            }
            
            if(isStart && tempRange.end && !isDisabled) className += " rounded-r-none";
            if(isEnd && !isDisabled) className += " rounded-l-none";

            return <div key={dayStr} 
              className={`p-0.5 ${(isBetween || isHoveringBetween) && !isDisabled ? 'bg-blue-100' : ''} ${(isStart && tempRange.end) && !isDisabled ? 'rounded-l-full' : ''} ${isEnd && !isDisabled ? 'rounded-r-full' : ''}`}
              onMouseEnter={() => !isDisabled && setHoverDate(day)} onMouseLeave={() => setHoverDate(null)}>
              <button 
                disabled={isDisabled}
                className={className} 
                onClick={() => !isDisabled && handleDateClick(day)}
              >
                {day.getDate()}
              </button>
            </div>
          })}
        </div>
      </div>
    );
  };
  
  const formatDate = (date: Date | null) => date ? date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-') : '';
  const buttonText = value.start && value.end ? `${formatDate(value.start)} ~ ${formatDate(value.end)}` : '选择日期范围';

  return (
    <div className="relative" ref={wrapperRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="w-full md:w-64 flex items-center justify-between px-3 py-2 border rounded-md bg-white text-gray-700">
        <CalendarIcon className="w-4 h-4 mr-2 text-gray-500" />
        <span className="flex-grow text-left">{buttonText}</span>
      </button>
      {isOpen && (
        <div className="absolute top-full mt-2 z-20 bg-white rounded-lg shadow-2xl border flex flex-col md:flex-row p-4">
          <div className="w-full md:w-32 pr-0 md:pr-4 border-b md:border-b-0 md:border-r mb-4 md:mb-0">
            <ul className="space-y-1 flex flex-wrap md:block gap-2 md:gap-0">
              {presets.map(p => (
                <li key={p.label} className="w-auto md:w-full"><button onClick={() => handlePresetClick(p)} className="w-full text-left text-sm p-2 rounded hover:bg-gray-100">{p.label}</button></li>
              ))}
            </ul>
          </div>
          <div className="pl-0 md:pl-4">
            <div className="flex justify-between items-center mb-2 px-4">
                <div className="flex items-center space-x-1">
                    <button onClick={() => moveYear(-1)} className="p-1 rounded hover:bg-gray-100"><ChevronsLeftIcon className="w-4 h-4 text-gray-600" /></button>
                    <button onClick={() => moveMonth(-1)} className="p-1 rounded hover:bg-gray-100"><ChevronLeftIcon className="w-4 h-4 text-gray-600" /></button>
                </div>
                <div className="font-semibold text-sm">{leftMonth.getFullYear()}年 {leftMonth.getMonth() + 1}月</div>
                <div className="hidden md:block font-semibold text-sm">{rightMonth.getFullYear()}年 {rightMonth.getMonth() + 1}月</div>
                <div className="flex items-center space-x-1">
                    <button onClick={() => moveMonth(1)} className="p-1 rounded hover:bg-gray-100"><ChevronRightIcon className="w-4 h-4 text-gray-600" /></button>
                    <button onClick={() => moveYear(1)} className="p-1 rounded hover:bg-gray-100"><ChevronsRightIcon className="w-4 h-4 text-gray-600" /></button>
                </div>
            </div>
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
              <Calendar monthDate={leftMonth} />
              <div className="hidden md:block">
                <Calendar monthDate={rightMonth} />
              </div>
            </div>
             <div className="flex justify-end items-center mt-4 pt-4 border-t space-x-2">
                 <div className="flex-grow text-sm text-gray-600">
                     {tempRange.start ? formatDate(tempRange.start) : '开始日期'} - {tempRange.end ? formatDate(tempRange.end) : '结束日期'}
                 </div>
                <button onClick={() => { setIsOpen(false); setTempRange(value); }} className="px-4 py-1.5 text-sm bg-gray-200 rounded-md hover:bg-gray-300">取消</button>
                <button onClick={handleApply} className="px-4 py-1.5 text-sm bg-primary text-white rounded-md hover:bg-primary-hover">确定</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
