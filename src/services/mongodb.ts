import mongoose from 'mongoose';
import { MONGODB_URL } from '../config';

const connectOptions: mongoose.ConnectOptions = {
  autoCreate: true,
  retryReads: true,
};
const connectMongodb = async () => {
  try {
    await mongoose.connect(MONGODB_URL, connectOptions);
  } catch (error) {
    console.error('Failed to connect to MongoDB', error);
    throw error;
  }
};
export default connectMongodb;
