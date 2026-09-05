import Kenat from "kenat";

export const formatEthDate = (dateInput: Date | string) => {
    if (!dateInput) return '';
    // return new Date(dateInput).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    return new Kenat(new Date(dateInput)).format({
        calendar: 'ethiopian',
        includeTime: true,
    })
};