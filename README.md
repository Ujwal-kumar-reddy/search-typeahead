# Distributed Search Suggestion Engine

A scalable and fault-tolerant search autocomplete platform developed using **Node.js**, **Express.js**, **Redis**, and **Docker**. The system is designed to deliver low-latency search suggestions while efficiently handling a large volume of search events through distributed caching and asynchronous processing techniques.

---

## Overview

This project simulates a production-grade search typeahead service capable of handling thousands of user requests with minimal response time. It combines distributed caching, consistent hashing, write batching, and trend-aware ranking to provide fast and relevant search suggestions.

---

## Key Features

### Distributed Redis Caching

* Utilizes a cluster of three Redis instances running inside Docker containers.
* Requests are distributed using a **Consistent Hashing** mechanism.
* Prevents excessive cache invalidation when cache nodes are added or removed.
* Delivers near-instant cache retrieval for popular search prefixes.

### Asynchronous Search Logging

* Search events are temporarily stored in an in-memory buffer.
* Database updates are executed periodically instead of on every request.
* Significantly reduces write pressure on the primary datastore.

### Trend-Based Search Ranking

* Suggestions are ranked using both historical popularity and recent activity.
* Ranking Formula:

```text
Trending Score = Total Searches + (Recent Searches × 5)
```

* Ensures that emerging trends can appear quickly in search results.
* A scheduled decay process gradually lowers old counts to maintain freshness.

### Frontend Optimization

* Debounced search requests (300ms delay).
* Minimum 3-character threshold before API calls.
* Reduced unnecessary network traffic.
* Improved user experience and server efficiency.

---

## Technology Stack

| Component        | Technology            |
| ---------------- | --------------------- |
| Backend          | Node.js               |
| Framework        | Express.js            |
| Cache Layer      | Redis                 |
| Containerization | Docker                |
| Scheduler        | Cron Jobs             |
| Frontend         | HTML, CSS, JavaScript |

---

# Installation Guide

## Prerequisites

Before running the application, ensure the following software is installed:

* Node.js (Version 18 or above)
* Docker Desktop
* Git

---

## Clone Repository

```bash
git clone <repository-url>
cd distributed-search-system
```

---

## Install Dependencies

```bash
npm install
```

---

## Start Redis Cache Cluster

Launch three independent Redis containers:

```bash
docker run -d --name cache-node-1 -p 6379:6379 redis:alpine

docker run -d --name cache-node-2 -p 6380:6379 redis:alpine

docker run -d --name cache-node-3 -p 6381:6379 redis:alpine
```

---

## Generate Initial Dataset

Create the dataset containing over 100,000 search records:

```bash
node generateData.js
```

This generates:

```text
dataset.json
```

which acts as the initial search history database.

---

## Run the Application

Start the backend server:

```bash
node server.js
```

After successful startup, open:

```text
index.html
```

or launch through VS Code Live Server.

---

# System Workflow

## Suggestion Request Flow

### Step 1: User Input

The frontend waits for:

* Minimum 3 characters
* 300ms pause in typing

before sending a request.

### Step 2: Prefix Routing

The backend computes a hash value for the entered prefix.

### Step 3: Cache Node Selection

Using Consistent Hashing, the prefix is assigned to a specific Redis node.

### Step 4: Cache Lookup

**Cache Hit**

* Results returned directly from Redis.

**Cache Miss**

* Suggestions generated from the primary datastore.
* Results cached for future requests.
* Response sent back to the user.

---

## Search Logging Flow

### Step 1: Search Submission

User executes a search query.

### Step 2: Buffer Storage

The query count is stored inside an in-memory aggregation buffer.

### Step 3: Scheduled Synchronization

Every 10 seconds:

* Buffered counts are merged.
* Database is updated in bulk.
* Related cache entries are invalidated.

---

# API Endpoints

## 1. Retrieve Suggestions

### Request

```http
GET /suggest?q=apple
```

### Response

```json
[
  "apple laptop pro",
  "apple laptop wireless"
]
```

---

## 2. Submit Search Event

### Request

```http
POST /search
```

### Body

```json
{
  "query": "apple laptop pro"
}
```

### Response

```json
{
  "message": "Search recorded successfully"
}
```

---

## 3. Cache Routing Inspector

### Request

```http
GET /cache/debug?prefix=app
```

### Response

```json
{
  "prefix": "app",
  "assignedNode": "Node_B",
  "cacheHit": true
}
```

---

# Performance Benefits

### Faster Reads

Most repeated searches are served directly from Redis, eliminating expensive database operations.

### Reduced Database Traffic

Thousands of search submissions can be merged into a single bulk update cycle, dramatically lowering write overhead.

### Lower Network Usage

Debouncing and minimum character restrictions reduce unnecessary API requests and improve responsiveness.

---

# Architectural Decisions

## Why Consistent Hashing?

Traditional modulo-based routing redistributes nearly all keys whenever a cache node changes.

Consistent Hashing limits redistribution to only a small subset of keys, preserving most cached data and improving scalability.

---

## Why Batch Database Updates?

Direct writes for every search request can overload the database during traffic spikes.

Batching:

* Improves throughput.
* Reduces contention.
* Enhances overall system stability.

### Trade-Off

A sudden server crash could result in the loss of a few seconds of buffered search events.

---

## Why Trend-Based Ranking?

Ranking solely by total historical searches makes it difficult for new trends to appear.

Combining recent activity with historical popularity ensures:

* Better relevance.
* Faster trend discovery.
* Dynamic search results.

---

# Future Enhancements

* Load Balancer Integration
* Redis Cluster Auto Scaling
* Real-Time Analytics Dashboard
* Elasticsearch Integration
* Kafka-Based Event Streaming
* Distributed Database Support

---

# Video Demonstration

Add your project demo video link here:

```text




https://github.com/user-attachments/assets/b43e28a3-8660-4a84-90b2-872b876ff611




```

---




