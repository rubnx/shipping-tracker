import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import TimelineComponent from './TimelineComponent';
import type { TimelineEvent } from '../../types';

// Mock timeline events for testing
const mockEvents: TimelineEvent[] = [
  {
    id: '1',
    timestamp: new Date('2024-01-01T10:00:00Z'),
    status: 'Booking Confirmed',
    location: 'Shanghai, China',
    description: 'Shipment booking has been confirmed',
    isCompleted: true,
    isCurrentStatus: false,
  },
  {
    id: '2',
    timestamp: new Date('2024-01-02T14:30:00Z'),
    status: 'Container Loaded',
    location: 'Shanghai Port, China',
    description: 'Container loaded onto vessel',
    isCompleted: true,
    isCurrentStatus: false,
  },
  {
    id: '3',
    timestamp: new Date('2024-01-03T08:15:00Z'),
    status: 'Departed Origin',
    location: 'Shanghai Port, China',
    description: 'Vessel departed from origin port',
    isCompleted: true,
    isCurrentStatus: false,
  },
  {
    id: '4',
    timestamp: new Date('2024-01-10T12:00:00Z'),
    status: 'In Transit',
    location: 'Pacific Ocean',
    description: 'Shipment is currently in transit',
    isCompleted: false,
    isCurrentStatus: true,
  },
  {
    id: '5',
    timestamp: new Date('2024-01-15T16:45:00Z'),
    status: 'Arrived Destination',
    location: 'Los Angeles, USA',
    description: 'Vessel arrived at destination port',
    isCompleted: false,
    isCurrentStatus: false,
  },
];

describe('TimelineComponent', () => {
  it('renders timeline with events correctly', () => {
    render(
      <TimelineComponent
        events={mockEvents}
        currentStatus="In Transit"
        completionPercentage={60}
      />
    );

    // Check if the component title is rendered
    expect(screen.getByText('Shipment Timeline')).toBeInTheDocument();

    // Check if all events are rendered
    expect(screen.getByText('Booking Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Container Loaded')).toBeInTheDocument();
    expect(screen.getByText('Departed Origin')).toBeInTheDocument();
    expect(screen.getAllByText('In Transit')).toHaveLength(2); // Header and timeline
    expect(screen.getByText('Arrived Destination')).toBeInTheDocument();

    // Check if descriptions are rendered
    expect(screen.getByText('Shipment booking has been confirmed')).toBeInTheDocument();
    expect(screen.getByText('Container loaded onto vessel')).toBeInTheDocument();
  });

  it('displays progress percentage correctly', () => {
    render(
      <TimelineComponent
        events={mockEvents}
        currentStatus="In Transit"
        completionPercentage={75}
      />
    );

    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('Progress')).toBeInTheDocument();
  });

  it('highlights current status correctly', () => {
    render(
      <TimelineComponent
        events={mockEvents}
        currentStatus="In Transit"
        completionPercentage={60}
      />
    );

    // The current status should be highlighted - get all elements and check the timeline one
    const currentStatusElements = screen.getAllByText('In Transit');
    const timelineStatusElement = currentStatusElements.find(el => 
      el.tagName === 'H3' && el.classList.contains('text-blue-600')
    );
    expect(timelineStatusElement).toBeInTheDocument();
  });

  it('shows completed events with checkmarks', () => {
    const { container } = render(
      <TimelineComponent
        events={mockEvents}
        currentStatus="In Transit"
        completionPercentage={60}
      />
    );

    // Check for checkmark SVGs in completed events
    const checkmarks = container.querySelectorAll('svg');
    expect(checkmarks.length).toBeGreaterThan(0);
  });

  it('displays locations for events', () => {
    render(
      <TimelineComponent
        events={mockEvents}
        currentStatus="In Transit"
        completionPercentage={60}
      />
    );

    expect(screen.getByText('📍 Shanghai, China')).toBeInTheDocument();
    expect(screen.getAllByText('📍 Shanghai Port, China')).toHaveLength(2); // Two events have this location
    expect(screen.getByText('📍 Pacific Ocean')).toBeInTheDocument();
  });

  it('renders loading state correctly', () => {
    render(
      <TimelineComponent
        events={[]}
        currentStatus=""
        completionPercentage={0}
        isLoading={true}
      />
    );

    // Check for loading skeleton elements
    const skeletonElements = document.querySelectorAll('.animate-pulse');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('renders empty state when no events provided', () => {
    render(
      <TimelineComponent
        events={[]}
        currentStatus=""
        completionPercentage={0}
      />
    );

    expect(screen.getByText('No tracking events available')).toBeInTheDocument();
  });

  it('hides progress bar when showProgress is false', () => {
    render(
      <TimelineComponent
        events={mockEvents}
        currentStatus="In Transit"
        completionPercentage={60}
        showProgress={false}
      />
    );

    expect(screen.queryByText('Progress')).not.toBeInTheDocument();
  });

  it('renders in compact mode correctly', () => {
    render(
      <TimelineComponent
        events={mockEvents}
        currentStatus="In Transit"
        completionPercentage={60}
        compact={true}
      />
    );

    // In compact mode, timestamps should not be shown
    // We can verify this by checking that the component still renders but with different styling
    expect(screen.getByText('Shipment Timeline')).toBeInTheDocument();
    // Get the timeline version of "In Transit" (not the header version)
    const inTransitElements = screen.getAllByText('In Transit');
    expect(inTransitElements.length).toBeGreaterThan(0);
  });

  it('sorts events by timestamp correctly', () => {
    const unsortedEvents: TimelineEvent[] = [
      {
        id: '2',
        timestamp: new Date('2024-01-03T08:15:00Z'),
        status: 'Second Event',
        location: 'Location 2',
        description: 'Second event description',
        isCompleted: true,
        isCurrentStatus: false,
      },
      {
        id: '1',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        status: 'First Event',
        location: 'Location 1',
        description: 'First event description',
        isCompleted: true,
        isCurrentStatus: false,
      },
      {
        id: '3',
        timestamp: new Date('2024-01-05T12:00:00Z'),
        status: 'Third Event',
        location: 'Location 3',
        description: 'Third event description',
        isCompleted: false,
        isCurrentStatus: true,
      },
    ];

    render(
      <TimelineComponent
        events={unsortedEvents}
        currentStatus="Third Event"
        completionPercentage={66}
      />
    );

    // Events should be rendered in chronological order
    // Get all h3 elements which contain the event status
    const eventHeaders = screen.getAllByRole('heading', { level: 3 });
    expect(eventHeaders[0]).toHaveTextContent('First Event');
    expect(eventHeaders[1]).toHaveTextContent('Second Event');
    expect(eventHeaders[2]).toHaveTextContent('Third Event');
  });

  it('applies custom className correctly', () => {
    const { container } = render(
      <TimelineComponent
        events={mockEvents}
        currentStatus="In Transit"
        completionPercentage={60}
        className="custom-timeline-class"
      />
    );

    const timelineElement = container.querySelector('.custom-timeline-class');
    expect(timelineElement).toBeInTheDocument();
  });

  it('formats dates correctly', () => {
    const eventWithSpecificDate: TimelineEvent[] = [
      {
        id: '1',
        timestamp: new Date('2024-03-15T14:30:00Z'),
        status: 'Test Event',
        location: 'Test Location',
        description: 'Test description',
        isCompleted: true,
        isCurrentStatus: false,
      },
    ];

    render(
      <TimelineComponent
        events={eventWithSpecificDate}
        currentStatus=""
        completionPercentage={100}
      />
    );

    // Check if date is formatted correctly (format may vary based on locale)
    expect(screen.getByText(/Mar 15/)).toBeInTheDocument();
  });

  it('shows last updated timestamp', () => {
    render(
      <TimelineComponent
        events={mockEvents}
        currentStatus="In Transit"
        completionPercentage={60}
      />
    );

    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });

  it('handles events without locations gracefully', () => {
    const eventsWithoutLocation: TimelineEvent[] = [
      {
        id: '1',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        status: 'Event Without Location',
        location: '',
        description: 'This event has no location',
        isCompleted: true,
        isCurrentStatus: false,
      },
    ];

    render(
      <TimelineComponent
        events={eventsWithoutLocation}
        currentStatus=""
        completionPercentage={100}
      />
    );

    expect(screen.getByText('Event Without Location')).toBeInTheDocument();
    expect(screen.getByText('This event has no location')).toBeInTheDocument();
    // Location icon should not be present
    expect(screen.queryByText(/📍/)).not.toBeInTheDocument();
  });
});