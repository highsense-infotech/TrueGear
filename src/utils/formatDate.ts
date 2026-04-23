export const formatDate = (iso?: string) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString();
};

// Convert YYYY-MM-DD to DD MMM YYYY format (e.g., "2026-01-30" to "30 Jan 2026")
export const formatDateForDisplay = (dateValue?: string) => {
  if (!dateValue) return '-';
  
  // Handle YYYY-MM-DD format
  if (dateValue.includes('-')) {
    const parts = dateValue.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parseInt(parts[1], 10);
      const day = parts[2];
      
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = monthNames[month - 1] || '';
      
      // Get last 2 digits of year
      const shortYear = year.slice(-2);
      
      return `${day} ${monthName} ${shortYear}`;
    }
  }
  
  return dateValue;
};

export default formatDate;

