import api from './axios';
import type { User } from '../types/user.types';

export const getUser = async (id: string): Promise<User> => {
  const { data } = await api.get(`/users/${id}`);
  return data;
};

export const getUsers = async (): Promise<User[]> => {
  const { data } = await api.get('/users');
  return data;
};
