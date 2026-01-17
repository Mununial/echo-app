import React, { useState } from 'react';
import './App.css';
import { Youtube, FileText, Video, ArrowRight, UploadCloud, Loader2 } from 'lucide-react';
import MindMap from './components/MindMap';

function App() {
  const [dragActive, setDragActive] = useState({ video: false, pdf: false });
  const [youtubeLink, setYoutubeLink] = useState('');
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDrag = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive({ ...dragActive, [type]: true });
    } else if (e.type === "dragleave") {
      setDragActive({ ...dragActive, [type]: false });
    }
  };

  const handleDrop = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive({ ...dragActive, [type]: false });
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0], type);
    }
  };

  const handleYoutubeSubmit = async (e) => {
    e.preventDefault();
    if (!youtubeLink) return;

    setLoading(true);
    setError(null);
    setNodes([]);
    setEdges([]);

    try {
      const response = await fetch('/api/analyze-youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeLink })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      if (data.nodes && data.edges) {
        setNodes(data.nodes);
        setEdges(data.edges);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleFileProcess = async (file, type) => {
    setLoading(true);
    setError(null);
    setNodes([]);
    setEdges([]);

    const formData = new FormData();
    // Determine endpoint and param name based on type
    let endpoint = '';
    let fieldName = '';

    if (type === 'video') {
      endpoint = '/api/analyze-video';
      fieldName = 'video';
    } else if (type === 'pdf') {
      endpoint = '/api/analyze-pdf';
      fieldName = 'pdf';
    } else {
      setError("Unsupported file type");
      setLoading(false);
      return;
    }

    formData.append(fieldName, file);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      if (data.nodes && data.edges) {
        setNodes(data.nodes);
        setEdges(data.edges);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }


  const handleFileSelect = (e, type) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0], type);
    }
  }

  return (
    <div className="app-container">
      {/* Background blobs for ambience */}
      <div className="blob" style={{ top: '-10%', left: '-10%' }}></div>
      <div className="blob" style={{ bottom: '-10%', right: '-10%', animationDelay: '-10s' }}></div>

      <header className="header">
        <h1 className="title">Echo <span className="highlight">Synthesizer</span></h1>
        <p className="subtitle">
          Transform your content into knowledge. Upload videos, PDFs, or paste YouTube links to generate comprehensive summaries and mind maps.
        </p>
      </header>

      {/* Inputs Section */}
      <div className="features-grid">
        {/* YouTube Section */}
        <div className="feature-card">
          <div className="card-icon">
            <Youtube size={28} strokeWidth={1.5} />
          </div>
          <h2 className="card-title">YouTube Analysis</h2>
          <p className="card-description">Paste a YouTube URL to extract insights and generate a knowledge graph instantly.</p>

          <form className="input-wrapper" onSubmit={handleYoutubeSubmit}>
            <input
              type="url"
              className="url-input"
              placeholder="https://youtube.com/..."
              value={youtubeLink}
              onChange={(e) => setYoutubeLink(e.target.value)}
              required
            />
            <button type="submit" className="action-btn" disabled={loading}>
              <ArrowRight size={20} />
            </button>
          </form>
        </div>

        {/* Video Upload Section */}
        <div className="feature-card">
          <div className="card-icon">
            <Video size={28} strokeWidth={1.5} />
          </div>
          <h2 className="card-title">Video Upload</h2>
          <p className="card-description">Upload your own video files (MP4, MKV) for direct processing and analysis.</p>

          <div
            className={`dropzone ${dragActive.video ? 'active' : ''}`}
            onDragEnter={(e) => handleDrag(e, 'video')}
            onDragLeave={(e) => handleDrag(e, 'video')}
            onDragOver={(e) => handleDrag(e, 'video')}
            onDrop={(e) => handleDrop(e, 'video')}
            onClick={() => document.getElementById('video-upload').click()}
          >
            <input
              type="file"
              id="video-upload"
              style={{ display: 'none' }}
              accept="video/*"
              onChange={(e) => handleFileSelect(e, 'video')}
            />
            <UploadCloud className="upload-icon" size={32} strokeWidth={1.5} />
            <span>Click or drag video here</span>
          </div>
        </div>

        {/* PDF Upload Section */}
        <div className="feature-card">
          <div className="card-icon">
            <FileText size={28} strokeWidth={1.5} />
          </div>
          <h2 className="card-title">Document Upload</h2>
          <p className="card-description">Analyze PDF documents and research papers to extract key information.</p>

          <div
            className={`dropzone ${dragActive.pdf ? 'active' : ''}`}
            onDragEnter={(e) => handleDrag(e, 'pdf')}
            onDragLeave={(e) => handleDrag(e, 'pdf')}
            onDragOver={(e) => handleDrag(e, 'pdf')}
            onDrop={(e) => handleDrop(e, 'pdf')}
            onClick={() => document.getElementById('pdf-upload').click()}
          >
            <input
              type="file"
              id="pdf-upload"
              style={{ display: 'none' }}
              accept=".pdf"
              onChange={(e) => handleFileSelect(e, 'pdf')}
            />
            <UploadCloud className="upload-icon" size={32} strokeWidth={1.5} />
            <span>Click or drag PDF here</span>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ margin: '4rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <Loader2 className="animate-spin" size={48} color="#6366f1" />
          <p style={{ color: '#94a3b8' }}>Analyzing content with Gemini AI...</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{ margin: '2rem 0', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '0.5rem', color: '#f87171' }}>
          {error}
        </div>
      )}

      {/* Results Section */}
      {nodes.length > 0 && !loading && (
        <div style={{ width: '100%', marginTop: '4rem', animation: 'fadeInDown 0.5s ease-out' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Knowledge Graph</h2>
          <MindMap nodes={nodes} edges={edges} />
        </div>
      )}

    </div>
  );
}

export default App;
