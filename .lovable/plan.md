

# Library Audio CD Browser

## Overview
A simple, focused tool to fetch and display your Sheffield Library's audio CD collection from their RSS feed, making it easy to search, filter, and export the catalog.

## Features

### 1. RSS Feed Input
- Clean input area at the top to paste your RSS feed URL
- "Load Feed" button to fetch the data
- Loading indicator while fetching
- Clear error messages if the feed fails to load

### 2. Data Table Display
Display parsed RSS data in a clean, sortable table with columns:
- **Title** - Album/audiobook name
- **Author/Artist** - Extracted from the content
- **Year** - Publication date
- **ISBN** - For reference
- **Link** - Clickable link to view in library catalog

### 3. Search & Filter
- **Global search box** - Instantly filter across all columns (title, author, year)
- Search is instant as you type

### 4. Sorting
- Click any column header to sort ascending/descending
- Visual indicator showing current sort direction

### 5. Pagination
- Configurable page size (25, 50, 100, or all records)
- Page navigation controls
- Display showing "Showing X-Y of Z items"

### 6. Export to CSV
- Export button to download all currently filtered results as a CSV file
- Includes all visible columns

### 7. Backend (Supabase Edge Function)
- Edge function to fetch the RSS feed server-side, avoiding CORS issues
- Parses the Atom XML and returns clean JSON data
- You'll need to connect your own Supabase project

## Design
- Clean, minimal interface focused on functionality
- Responsive layout that works on desktop and mobile
- Light/modern styling using the existing design system

