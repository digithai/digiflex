/* Truncates a Holiday name to a specified maximum length and adds an ellipsis if needed. */
export const truncateText = (text, maxLength) => {
    if (!text) return 'Holiday';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};
