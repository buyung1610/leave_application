import express from 'express';
import bodyParser from 'body-parser';
import allowCrossDomain from './middleware/allowCrossDomain';

import userRoutes from './routes/userRoutes';
import submissionRoutes from './routes/leaveSubmissionsRoutes';
import authRoutes from './routes/authRoutes';
import allowanceRoutes from './routes/leaveAllowanceRoutes';
import './jobs/updateLeaveAllowance';

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(allowCrossDomain);

app.use('/auth', authRoutes)
app.use('/users', userRoutes);
app.use('/submissions', submissionRoutes)
app.use('/allowance', allowanceRoutes)

const ip = '192.168.10.26'
const port = 3000 ;
app.listen(port, ip, () => {
  console.log(`Server is running on ${ip}:${port}`);
});