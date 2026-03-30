import axios from 'axios';

export const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

export const formatSRD = (amount) => {
  return `SRD ${Number(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`;
};

export const getInitials = (name) => {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
};

export { axios };
