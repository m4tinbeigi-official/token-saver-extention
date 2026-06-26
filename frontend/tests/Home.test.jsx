import React from 'react';
import { render, screen } from '@testing-library/react';
import Home from '../src/pages/Home';

describe('Home component', () => {
  test('renders hero title in English by default', () => {
    render(<Home lang="en" />);
    const title = screen.getByText(/Optimize Token Consumption for/i);
    expect(title).toBeInTheDocument();
  });
});
