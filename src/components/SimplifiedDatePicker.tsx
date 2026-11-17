import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n';

interface SimplifiedDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: 'dob' | 'donation';
}

export const SimplifiedDatePicker: React.FC<SimplifiedDatePickerProps> = ({ 
  value, 
  onChange, 
  required = false,
  type = 'dob'
}) => {
  const { lang, n } = useLanguage();
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        setYear(parts[0]);
        setMonth(parts[1]);
        setDay(parts[2]);
      }
    } else {
      setYear('');
      setMonth('');
      setDay('');
    }
  }, [value]);

  const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
  const months = [
    { name: 'Jan', bn: 'জানুয়ারি', value: '01' },
    { name: 'Feb', bn: 'ফেব্রুয়ারি', value: '02' },
    { name: 'Mar', bn: 'মার্চ', value: '03' },
    { name: 'Apr', bn: 'এপ্রিল', value: '04' },
    { name: 'May', bn: 'মে', value: '05' },
    { name: 'Jun', bn: 'জুন', value: '06' },
    { name: 'Jul', bn: 'জুলাই', value: '07' },
    { name: 'Aug', bn: 'আগস্ট', value: '08' },
    { name: 'Sep', bn: 'সেপ্টেম্বর', value: '09' },
    { name: 'Oct', bn: 'অক্টোবর', value: '10' },
    { name: 'Nov', bn: 'নভেম্বর', value: '11' },
    { name: 'Dec', bn: 'ডিসেম্বর', value: '12' },
  ];
  
  const currentYear = new Date().getFullYear();
  let years: string[] = [];
  
  if (type === 'dob') {
    years = Array.from({ length: 100 }, (_, i) => String(currentYear - i));
  } else {
    years = Array.from({ length: 15 }, (_, i) => String(currentYear - i));
  }

  const handleUpdate = (d: string, m: string, y: string) => {
    if (d && m && y) {
      onChange(`${y}-${m}-${d}`);
    } else if (!d && !m && !y) {
      onChange('');
    }
  };

  const isAnySelected = Boolean(day || month || year);
  const isFieldRequired = required || isAnySelected;

  return (
    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
      <select 
        value={day} 
        onChange={(e) => { 
          const val = e.target.value;
          setDay(val); 
          handleUpdate(val, month, year); 
        }}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 sm:px-3 sm:py-3 text-[11px] sm:text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-red-600 transition-all cursor-pointer appearance-none text-center"
        required={isFieldRequired}
      >
        <option value="">{lang === 'bn' ? 'দিন' : 'DD'}</option>
        {days.map(d => <option key={d} value={d}>{n(d)}</option>)}
      </select>
      <select 
        value={month} 
        onChange={(e) => { 
          const val = e.target.value;
          setMonth(val); 
          handleUpdate(day, val, year); 
        }}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 sm:px-3 sm:py-3 text-[11px] sm:text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-red-600 transition-all cursor-pointer appearance-none text-center"
        required={isFieldRequired}
      >
        <option value="">{lang === 'bn' ? 'মাস' : 'MM'}</option>
        {months.map(m => <option key={m.value} value={m.value}>{lang === 'bn' ? m.bn : m.name}</option>)}
      </select>
      <select 
        value={year} 
        onChange={(e) => { 
          const val = e.target.value;
          setYear(val); 
          handleUpdate(day, month, val); 
        }}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 sm:px-3 sm:py-3 text-[11px] sm:text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-red-600 transition-all cursor-pointer appearance-none text-center"
        required={isFieldRequired}
      >
        <option value="">{lang === 'bn' ? 'বছর' : 'YYYY'}</option>
        {years.map(y => <option key={y} value={y}>{n(y)}</option>)}
      </select>
    </div>
  );
};
