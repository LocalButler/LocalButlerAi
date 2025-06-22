import React from 'react'
import CalendarSection from './CalendarSection'

describe('<CalendarSection />', () => {
  it('renders', () => {
    // see: https://on.cypress.io/mounting-react
    cy.mount(<CalendarSection />)
  })
})