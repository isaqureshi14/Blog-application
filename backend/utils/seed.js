// utils/seed.js — Seeds the MongoDB database with initial users and articles
'use strict';

const path     = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const User     = require('../models/User');
const Blog     = require('../models/Blog');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/blogverse';

const seedData = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB at:', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('[Seed] Connected successfully.');

    // Clear existing collections
    await User.deleteMany({});
    await Blog.deleteMany({});
    console.log('[Seed] Cleared existing Users and Blogs collections.');

    // Create an initial author user
    const author = await User.create({
      name:            'Alex Morgan',
      username:        'alexmorgan',
      email:           'alex@blogverse.com',
      password:        'Password123!',
      confirmPassword: 'Password123!',
      role:            'user',
    });
    console.log('[Seed] Created default author user:', author.email);

    // Initial blog posts
    const sampleBlogs = [
      {
        title:      'Building Accessible Web Apps with Pure HTML & CSS',
        category:   'technology',
        status:     'published',
        author:     author._id,
        coverImage: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
        excerpt:    'Discover how semantic markup, CSS variables, and clean styling patterns allow you to build blazing-fast accessible applications without bloated libraries.',
        tags:       ['html', 'css', 'accessibility', 'frontend'],
        content: `In contemporary web development, the instinct is often to install a heavyweight UI framework before writing a single line of business logic. But modern browser standards have evolved dramatically.

## Semantic Foundations

Screen readers and assistive devices rely fundamentally on meaningful document outlines. Using proper heading hierarchies (\`h1\` through \`h6\`), native landmarks (\`header\`, \`nav\`, \`main\`, \`article\`, \`footer\`), and keyboard-navigable interactive controls ensures that every reader experiences the full narrative without artificial barriers.

> "Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away."

## Practical Steps
- Use native button elements instead of divs with click handlers.
- Ensure all interactive inputs have visible, associated label elements.
- Keep contrast ratios at or above WCAG AA compliance (4.5:1 for normal body text).
- Rely on modern CSS custom properties to maintain dark/light modes cleanly.`,
        views: 8420,
      },
      {
        title:      'The Art of Digital Restraint: Why Minimalist UI Wins',
        category:   'design',
        status:     'published',
        author:     author._id,
        coverImage: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80',
        excerpt:    'Cluttered interfaces drive users away. Focusing on negative space, crisp typography, and intentional color palettes enhances readability and trust.',
        tags:       ['design', 'minimalism', 'ui', 'typography'],
        content: `Every element placed onto a screen costs a fraction of the user's finite attention span. The most enduring publications and products know how to speak quietly.

## The Power of Negative Space

Whitespace is not empty space; it is a structural element. By giving headlines and paragraphs room to breathe, visual hierarchy emerges naturally without needing dozens of decorative borders and background cards.

## Intentional Dual-Tone Palettes

Limiting colors to black, white, and subtle tints of gray shifts the user's primary focus directly to the writing. When color is removed as a gimmick, typography and layout must carry the entire weight of communication.`,
        views: 5190,
      },
      {
        title:      'From Junior to Staff: Navigating the Modern Dev Roadmap',
        category:   'career',
        status:     'published',
        author:     author._id,
        coverImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
        excerpt:    'Technical chops only get you halfway. Communication tactics, system design habits, and sponsorship networks are what actually accelerate careers.',
        tags:       ['career', 'engineering', 'mentorship'],
        content: `Early in your career, output is measured in pull requests merged and tickets closed. As you progress toward senior and staff levels, your leverage shifts to architectural decisions, mentoring teammates, and unblocking organizations.

## Key Shifts in Perspective
- **From coding to problem definition:** The highest leverage code is the code you convince the team not to write.
- **Clear technical writing:** Writing concise RFCs and architectural decision records (ADRs) allows your ideas to scale asynchronously across time zones.
- **Sponsorship over mentorship:** Seek champions who will mention your name in rooms where opportunities are being handed out.`,
        views: 6710,
      },
      {
        title:      'Mastering CSS Grid and Flexbox for Responsive Layouts',
        category:   'technology',
        status:     'draft',
        author:     author._id,
        coverImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
        excerpt:    'A deep dive into subgrid, container queries, and auto-fit minmax patterns for fluid responsive architectures.',
        tags:       ['css', 'grid', 'flexbox'],
        content: `Modern CSS provides two complementary layout engines: Flexbox for one-dimensional linear flow, and Grid for two-dimensional compositional control. Combining them creates fluid designs with zero media query clutter.`,
        views: 0,
      },
    ];

    await Blog.create(sampleBlogs);
    console.log(`[Seed] Seeded ${sampleBlogs.length} initial blog posts!`);

    console.log('[Seed] Database initialization complete! Database "blogverse" is active.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[Seed] Error seeding database:', err.message);
    process.exit(1);
  }
};

seedData();
