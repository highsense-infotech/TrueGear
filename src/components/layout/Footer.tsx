import React from 'react';

const Footer: React.FC = () => (
  <footer style={{ padding: 12, borderTop: '1px solid #eee', marginTop: 20 }}>
    <small>© {new Date().getFullYear()} TrueGear</small>
  </footer>
);

export default Footer;
