# Shipping Tracking App - Development Instructions

## Project Overview
Build a modern, minimal shipping tracking application that allows users to track shipments using booking numbers, container numbers, or bill of lading numbers. The app should provide real-time tracking information with a clean, professional interface similar to Flexport or Freightos.

## Core Features & Requirements

### 1. User Interface Design
- **Design Philosophy**: Clean, minimal, modern interface
- **Color Scheme**: Use neutral colors with blue accents (similar to Flexport's palette)
- **Typography**: Modern, readable fonts (Inter, Poppins, or similar)
- **Layout**: Card-based design with plenty of whitespace
- **Responsive**: Mobile-first approach, works on all devices

### 2. Input & Search Functionality
- **Search Types**: Support for:
  - Booking Number (BKG)
  - Container Number (CNTR)
  - Bill of Lading (BOL)
- **Input Validation**: Real-time validation with clear error messages
- **Auto-detection**: Automatically detect input type based on format
- **Search History**: Store recent searches (local storage)

### 3. Tracking Information Display

#### Status Timeline
- Visual timeline showing:
  - Booking confirmed
  - Container loaded
  - Departed origin port
  - In transit
  - Arrived destination port
  - Container discharged
  - Available for pickup
  - Delivered
- Each status with timestamp and location
- Current status highlighted
- Progress bar showing completion percentage

#### Shipment Details Card
- **Basic Info**: 
  - Tracking number
  - Service type (FCL/LCL)
  - Carrier/Shipping line
  - Vessel name and voyage
- **Route Info**:
  - Origin port and city
  - Destination port and city
  - Estimated/Actual departure
  - Estimated/Actual arrival
- **Container Details**:
  - Container number(s)
  - Size and type (20ft, 40ft, etc.)
  - Seal number
  - Weight and dimensions

#### Interactive Map
- **Map Provider**: Use Mapbox or Google Maps
- **Route Visualization**: Show shipping route with:
  - Origin and destination markers
  - Current vessel position (if available)
  - Port stops along the route
  - Estimated arrival zones
- **Real-time Updates**: Update vessel position periodically
- **Info Windows**: Click markers for port/location details

### 4. API Integration Strategy

#### Primary APIs to Integrate
1. **SeaRates API** - Global shipping data
2. **Portcast API** - Port and vessel tracking
3. **MarineTraffic API** - Vessel positions and AIS data
4. **Freightos API** - Multi-carrier tracking
5. **Individual Carrier APIs**:
   - Maersk API
   - CMA CGM API
   - COSCO API
   - Hapag-Lloyd API
   - MSC API

#### API Management
- **Fallback System**: Try multiple APIs if primary fails
- **Rate Limiting**: Implement proper rate limiting
- **Caching**: Cache responses to reduce API calls
- **Error Handling**: Graceful degradation when APIs are unavailable

### 5. Loading States & Feedback

#### Loading Indicators
- **Search Loading**: Skeleton cards while fetching data
- **Map Loading**: Loading spinner on map container
- **Status Updates**: Subtle loading indicators for refreshes

#### Progress Feedback
- **Search Progress**: "Searching multiple carriers..."
- **Data Fetching**: "Fetching latest updates..."
- **Map Loading**: "Loading route information..."

#### Error States
- **Not Found**: "Shipment not found. Please check your tracking number."
- **API Error**: "Unable to fetch updates. Trying alternative sources..."
- **Network Error**: "Connection issues. Please try again."

### 6. Technical Implementation

#### Frontend Framework
- **React** with TypeScript
- **State Management**: Zustand or Redux Toolkit
- **Styling**: Tailwind CSS
- **Icons**: Lucide React or Heroicons
- **Maps**: Mapbox GL JS or Google Maps

#### Backend Requirements
- **Node.js** with Express or **Next.js** API routes
- **Database**: PostgreSQL or MongoDB for caching
- **Queue System**: Redis for managing API requests
- **Authentication**: JWT for API access management

#### Data Structure
```typescript
interface ShipmentTracking {
  trackingNumber: string;
  trackingType: 'booking' | 'container' | 'bol';
  carrier: string;
  service: 'FCL' | 'LCL';
  status: ShipmentStatus;
  timeline: TimelineEvent[];
  route: RouteInfo;
  containers: Container[];
  vessel: VesselInfo;
  documents: Document[];
}

interface TimelineEvent {
  timestamp: Date;
  status: string;
  location: string;
  description: string;
  isCompleted: boolean;
}
```

### 7. User Experience Enhancements

#### Search Experience
- **Auto-complete**: Suggest recent searches
- **Format Help**: Show example formats for each tracking type
- **Batch Search**: Allow multiple tracking numbers

#### Information Hierarchy
- **Primary Info**: Status, ETA, current location
- **Secondary Info**: Container details, vessel info
- **Tertiary Info**: Historical events, documents

#### Accessibility
- **Screen Reader Support**: Proper ARIA labels
- **Keyboard Navigation**: Full keyboard accessibility
- **High Contrast**: Support for high contrast mode

### 8. Performance Optimization

#### Frontend Performance
- **Code Splitting**: Lazy load components
- **Image Optimization**: Optimize map tiles and icons
- **Caching**: Cache API responses and static assets

#### Backend Performance
- **Database Indexing**: Index tracking numbers
- **API Caching**: Cache responses for 5-15 minutes
- **Connection Pooling**: Efficient database connections

### 9. Security Considerations

#### API Security
- **Rate Limiting**: Prevent abuse
- **Input Validation**: Sanitize all inputs
- **API Keys**: Secure storage and rotation
- **CORS**: Proper CORS configuration

#### Data Privacy
- **No PII Storage**: Don't store sensitive shipment data
- **Secure Transmission**: HTTPS only
- **Session Management**: Secure session handling

### 10. Development Phases

#### Phase 1: Core MVP
- Basic search functionality
- Simple status display
- One primary API integration
- Basic responsive design

#### Phase 2: Enhanced Features
- Interactive map
- Multiple API integration
- Timeline visualization
- Advanced error handling

#### Phase 3: Polish & Optimization
- Advanced animations
- Performance optimization
- Additional carrier support
- Analytics integration

## Sample Component Structure

```
src/
├── components/
│   ├── SearchBar/
│   ├── TrackingResults/
│   ├── StatusTimeline/
│   ├── ShipmentMap/
│   ├── LoadingStates/
│   └── ErrorBoundary/
├── services/
│   ├── api/
│   ├── tracking/
│   └── cache/
├── hooks/
├── types/
├── utils/
└── styles/
```

## Key Success Metrics
- **Performance**: Page load under 2 seconds
- **Accuracy**: 95%+ successful tracking lookups
- **Usability**: Intuitive interface requiring no training
- **Reliability**: 99.9% uptime with graceful fallbacks

## Additional Recommendations

1. **Progressive Web App**: Make it installable on mobile devices
2. **Push Notifications**: Alert users of status changes
3. **Export Options**: PDF reports, email summaries
4. **Multi-language**: Support for major shipping languages
5. **Dark Mode**: Professional dark theme option
6. **Analytics**: Track user behavior and API performance
7. **Feedback System**: Allow users to report issues
8. **Documentation**: Comprehensive API documentation

This specification provides a solid foundation for building a professional shipping tracking application that rivals industry leaders while maintaining excellent user experience and technical performance.

## Additional Recommendations

1. **Progressive Web App**: Make it installable on mobile devices
2. **Push Notifications**: Alert users of status changes
3. **Export Options**: PDF reports, email summaries
4. **Multi-language**: Support for major shipping languages
5. **Dark Mode**: Professional dark theme option
6. **Analytics**: Track user behavior and API performance
7. **Feedback System**: Allow users to report issues
8. **Documentation**: Comprehensive API documentation

## Free Development Stack

**Frontend (Free):**
- React with Vite (faster than Create React App)
- Tailwind CSS for styling
- Leaflet for mapping (if avoiding paid map services)
- Vercel for hosting (free tier)

**Backend (Free):**
- Next.js API routes (deployed on Vercel)
- Supabase for database (free tier)
- Upstash Redis for caching (free tier)
- Planetscale for MySQL (free tier alternative)

**Free Services:**
- GitHub for version control
- Vercel for deployment
- Cloudflare for CDN (free tier)
- Sentry for error tracking (free tier)

## Budget-Friendly Scaling Plan

**Month 1-2**: Free APIs only, validate concept
**Month 3-4**: Add freemium APIs, implement caching
**Month 5-6**: Scale to paid tiers based on usage
**Month 7+**: Consider premium APIs for advanced features# Shipping Tracking App - Development Instructions

## Project Overview
Build a modern, minimal shipping tracking application that allows users to track shipments using booking numbers, container numbers, or bill of lading numbers. The app should provide real-time tracking information with a clean, professional interface similar to Flexport or Freightos.

## Core Features & Requirements

### 1. User Interface Design
- **Design Philosophy**: Clean, minimal, modern interface
- **Color Scheme**: Use neutral colors with blue accents (similar to Flexport's palette)
- **Typography**: Modern, readable fonts (Inter, Poppins, or similar)
- **Layout**: Card-based design with plenty of whitespace
- **Responsive**: Mobile-first approach, works on all devices

### 2. Input & Search Functionality
- **Search Types**: Support for:
  - Booking Number (BKG)
  - Container Number (CNTR)
  - Bill of Lading (BOL)
- **Input Validation**: Real-time validation with clear error messages
- **Auto-detection**: Automatically detect input type based on format
- **Search History**: Store recent searches (local storage)

### 3. Tracking Information Display

#### Status Timeline
- Visual timeline showing:
  - Booking confirmed
  - Container loaded
  - Departed origin port
  - In transit
  - Arrived destination port
  - Container discharged
  - Available for pickup
  - Delivered
- Each status with timestamp and location
- Current status highlighted
- Progress bar showing completion percentage

#### Shipment Details Card
- **Basic Info**: 
  - Tracking number
  - Service type (FCL/LCL)
  - Carrier/Shipping line
  - Vessel name and voyage
- **Route Info**:
  - Origin port and city
  - Destination port and city
  - Estimated/Actual departure
  - Estimated/Actual arrival
- **Container Details**:
  - Container number(s)
  - Size and type (20ft, 40ft, etc.)
  - Seal number
  - Weight and dimensions

#### Interactive Map
- **Map Provider**: Use Mapbox or Google Maps
- **Route Visualization**: Show shipping route with:
  - Origin and destination markers
  - Current vessel position (if available)
  - Port stops along the route
  - Estimated arrival zones
- **Real-time Updates**: Update vessel position periodically
- **Info Windows**: Click markers for port/location details

### 4. API Integration Strategy

#### Free/Freemium APIs to Integrate

**Primary Free Options:**
1. **USPS Web Tools API** - Completely free for USPS tracking
2. **FedEx API** - Free tier available with rate limits
3. **UPS API** - Free tier for basic tracking
4. **DHL API** - Free tier with limitations
5. **Ship24 API** - Free tier with 100 requests/month for global tracking
6. **TrackingMore API** - Free tier with 100 requests/month
7. **AfterShip API** - Free tier with 100 shipments/month

**Maritime/Container Tracking (Free Tiers):**
1. **MarineTraffic API** - Free tier available for vessel data
2. **Datalastic API** - Free tier for vessel tracking and AIS data
3. **OpenShipData API** - Free marine vessel data
4. **Individual Carrier APIs** (often free):
   - Maersk API (some endpoints free)
   - CMA CGM API (limited free access)
   - COSCO API (basic tracking free)

**Mapping (Free Options):**
1. **OpenStreetMap with Leaflet** - Completely free
2. **Mapbox** - Free tier: 50,000 requests/month
3. **Google Maps** - Free tier: $200 credit monthly

#### Free API Strategy & Implementation

**Phase 1: Start with Free APIs**
- USPS Web Tools API - completely free after simple registration
- FedEx, UPS, DHL free tiers for basic tracking
- Ship24 API for global tracking with free tier
- OpenShipData API for marine vessel data

**Phase 2: Add Maritime APIs**
- MarineTraffic API for container tracking with free tier
- Datalastic API for vessel tracking and AIS data
- Individual carrier APIs (many have free basic tiers)

**Phase 3: Scale with Freemium**
- TrackingMore API for bulk tracking data
- AfterShip API for advanced features
- Upgrade to paid tiers as needed

**Cost-Effective Approach:**
- Start with free tiers to validate the concept
- Implement intelligent caching to maximize free quotas
- Use web scraping as fallback (within legal/TOS limits)
- Scale to paid tiers only when revenue justifies costs

### 5. Loading States & Feedback

#### Loading Indicators
- **Search Loading**: Skeleton cards while fetching data
- **Map Loading**: Loading spinner on map container
- **Status Updates**: Subtle loading indicators for refreshes

#### Progress Feedback
- **Search Progress**: "Searching multiple carriers..."
- **Data Fetching**: "Fetching latest updates..."
- **Map Loading**: "Loading route information..."

#### Error States
- **Not Found**: "Shipment not found. Please check your tracking number."
- **API Error**: "Unable to fetch updates. Trying alternative sources..."
- **Network Error**: "Connection issues. Please try again."

### 6. Technical Implementation

#### Frontend Framework
- **React** with TypeScript
- **State Management**: Zustand or Redux Toolkit
- **Styling**: Tailwind CSS
- **Icons**: Lucide React or Heroicons
- **Maps**: Mapbox GL JS or Google Maps

#### Backend Requirements
- **Node.js** with Express or **Next.js** API routes
- **Database**: PostgreSQL or MongoDB for caching
- **Queue System**: Redis for managing API requests
- **Authentication**: JWT for API access management

#### Data Structure
```typescript
interface ShipmentTracking {
  trackingNumber: string;
  trackingType: 'booking' | 'container' | 'bol';
  carrier: string;
  service: 'FCL' | 'LCL';
  status: ShipmentStatus;
  timeline: TimelineEvent[];
  route: RouteInfo;
  containers: Container[];
  vessel: VesselInfo;
  documents: Document[];
}

interface TimelineEvent {
  timestamp: Date;
  status: string;
  location: string;
  description: string;
  isCompleted: boolean;
}
```

### 7. User Experience Enhancements

#### Search Experience
- **Auto-complete**: Suggest recent searches
- **Format Help**: Show example formats for each tracking type
- **Batch Search**: Allow multiple tracking numbers

#### Information Hierarchy
- **Primary Info**: Status, ETA, current location
- **Secondary Info**: Container details, vessel info
- **Tertiary Info**: Historical events, documents

#### Accessibility
- **Screen Reader Support**: Proper ARIA labels
- **Keyboard Navigation**: Full keyboard accessibility
- **High Contrast**: Support for high contrast mode

### 8. Performance Optimization

#### Frontend Performance
- **Code Splitting**: Lazy load components
- **Image Optimization**: Optimize map tiles and icons
- **Caching**: Cache API responses and static assets

#### Backend Performance
- **Database Indexing**: Index tracking numbers
- **API Caching**: Cache responses for 5-15 minutes
- **Connection Pooling**: Efficient database connections

### 9. Security Considerations

#### API Security
- **Rate Limiting**: Prevent abuse
- **Input Validation**: Sanitize all inputs
- **API Keys**: Secure storage and rotation
- **CORS**: Proper CORS configuration

#### Data Privacy
- **No PII Storage**: Don't store sensitive shipment data
- **Secure Transmission**: HTTPS only
- **Session Management**: Secure session handling

### 10. Development Phases

#### Phase 1: Core MVP
- Basic search functionality
- Simple status display
- One primary API integration
- Basic responsive design

#### Phase 2: Enhanced Features
- Interactive map
- Multiple API integration
- Timeline visualization
- Advanced error handling

#### Phase 3: Polish & Optimization
- Advanced animations
- Performance optimization
- Additional carrier support
- Analytics integration

## Sample Component Structure

```
src/
├── components/
│   ├── SearchBar/
│   ├── TrackingResults/
│   ├── StatusTimeline/
│   ├── ShipmentMap/
│   ├── LoadingStates/
│   └── ErrorBoundary/
├── services/
│   ├── api/
│   ├── tracking/
│   └── cache/
├── hooks/
├── types/
├── utils/
└── styles/
```

## Key Success Metrics
- **Performance**: Page load under 2 seconds
- **Accuracy**: 95%+ successful tracking lookups
- **Usability**: Intuitive interface requiring no training
- **Reliability**: 99.9% uptime with graceful fallbacks

#### Free Alternative: Web Scraping Approach
If API limits are restrictive, consider ethical web scraping:
- **Carrier Websites**: Many carriers provide tracking pages that can be scraped
- **Tools**: Use Puppeteer or Playwright for dynamic content
- **Respect**: Follow robots.txt and implement delays
- **Legal**: Ensure compliance with terms of service
- **Backup**: Use as fallback when APIs fail or hit limits

**Free Mapping Solutions:**
- **OpenStreetMap + Leaflet**: Completely free mapping
- **Mapbox Free Tier**: 50,000 requests/month
- **Google Maps Free Tier**: $200/month credit

