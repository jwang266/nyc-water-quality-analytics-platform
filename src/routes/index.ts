import type { Express } from 'express';
import homeRoutes from './home.js';
import usersRoutes from './users.js';
import boroughsRoutes from './boroughs.js';
import apiRoutes from './api.js';
import waterSamplesRoutes from './waterSamples.js';
import voteRoutes from './votes.js';

const constructorMethod = (app: Express): void => {
  app.use('/users', usersRoutes);
  app.use('/boroughs', boroughsRoutes);
  app.use('/waterSamples', waterSamplesRoutes);
  app.use('/votes', voteRoutes);
  app.use('/api', apiRoutes);

  app.use('/', homeRoutes);

  app.use((req, res) => {
    res.status(404).render('error', {
      title: '404 - Page Not Found',
      error: 'The page you are looking for does not exist.',
      link: '/',
      class: 'error-page'
    });
  });
};

export default constructorMethod;
