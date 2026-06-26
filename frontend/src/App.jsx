import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import Tutorial from './pages/Tutorial';
import Login from './pages/Login';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main Website localized routes */}
        <Route path="/" element={<Home lang="en" />} />
        <Route path="/fa" element={<Home lang="fa" />} />

        {/* Blog index localized routes */}
        <Route path="/blog" element={<Blog lang="en" />} />
        <Route path="/blog-fa" element={<Blog lang="fa" />} />

        {/* Blog article viewer (full-size page) */}
        <Route path="/blog/:slug" element={<BlogPost lang="fa" />} />

        {/* Tutorial page with TOC sidebar */}
        <Route path="/tutorial" element={<Tutorial lang="fa" />} />

        {/* Unified premium Login page */}
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}
