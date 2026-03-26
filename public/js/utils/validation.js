/**
 * Email Validation Utility
 * Checks if the email belongs to National Chi Nan University domain (@ncnu.edu.tw)
 */

export const isValidNCNUEmail = (email) => {
    // Regex for standard email format + ending with @mail1.ncnu.edu.tw or @ncnu.edu.tw
    // Case insensitive
    const ncnuRegex = /^[a-zA-Z0-9._%+-]+@(mail1\.)?ncnu\.edu\.tw$/i;
    // Allow student ID emails specifically (s + numbers @mail1.ncnu.edu.tw) or general staff emails
    return ncnuRegex.test(email);
};

export const sanitizeInput = (input) => {
    const div = document.createElement('div');
    div.innerText = input;
    return div.innerHTML;
};
