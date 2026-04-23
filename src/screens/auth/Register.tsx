import React, { useState } from 'react';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('register', { name, email, password });
  };

  return (
    <div style={{ maxWidth: 420, margin: '40px auto' }}>
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        <Input label="Name" value={name} onChange={(e) => setName(e.currentTarget.value)} />
        <Input label="Email" value={email} onChange={(e) => setEmail(e.currentTarget.value)} />
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.currentTarget.value)} />
        <Button type="submit">Create account</Button>
      </form>
    </div>
  );
};

export default Register;
