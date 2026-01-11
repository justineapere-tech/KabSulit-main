// Campus email validation - customize this to match your campus email domain
// Example: @university.edu, @campus.ac.id, etc.
export const CAMPUS_EMAIL_DOMAIN = '@cvsu.edu.ph'; // Change this to your campus domain

export const isValidCampusEmail = (email) => {
  if (!email) return false;
  return email.toLowerCase().endsWith(CAMPUS_EMAIL_DOMAIN.toLowerCase());
};

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  return password && password.length >= 6;
};
