export const formatCurrency = (amount) => {
  if (amount == null) return '₹0.00';
  return `₹${parseFloat(amount).toFixed(2)}`;
};

export const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN');
};

export const getStatusBadge = (status) => {
  const badges = {
    PAID: 'bg-success',
    OVERPAID: 'bg-info',
    PARTIALLY_PAID: 'bg-warning text-dark',
    UNPAID: 'bg-danger',
    GENERATED: 'bg-secondary',
    CANCELLED: 'bg-dark'
  };
  return badges[status] || 'bg-secondary';
};