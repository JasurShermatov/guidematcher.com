// AdminAccount.jsx (for Customer role - alias to GuideAccount or custom)

import GuideAccount from './GuideAccount'; // Assuming AdminAccount is for Customer (Guide)

const AdminAccount = (props) => {
    return <GuideAccount {...props} />;
};

export default AdminAccount;