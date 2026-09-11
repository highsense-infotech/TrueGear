import React from 'react';
import type { User } from '../../types/user.types';

const UserCard: React.FC<{ user: User }> = ({ user }) => (
  <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 6 }}>
    <h3 style={{ margin: '0 0 8px 0' }}>{user.username}</h3>
    <div>{user.email}</div>
  </div>
);

export default UserCard;
