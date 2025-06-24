import React from 'react';
import { render, screen } from '@testing-library/react';
import UserProfileSection from '../UserProfileSection';

describe('UserProfileSection', () => {
  it('renders the profile section title', () => {
    render(
      <UserProfileSection userProfile={null} onProfileUpdate={() => {}} onLoginChange={() => {}} />
    );
    expect(screen.getByText(/my profile/i)).toBeInTheDocument();
  });
});
