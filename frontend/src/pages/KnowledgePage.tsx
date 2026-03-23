import { useEffect, useState } from 'react';
import { Card, Button, Input, TextArea, Spinner, Badge, Alert } from '../components';
import { FileUp, Plus } from 'lucide-react';
import { knowledgeService } from '../services/knowledge.service';
import type { KnowledgeBase } from '../types';
import '../page.css';

type ComposerMode = 'article' | 'upload';

export function KnowledgePage() {
  const [composerMode, setComposerMode] = useState<ComposerMode>('article');
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [articles, setArticles] = useState<KnowledgeBase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: 'General',
    content: '',
  });
  const [uploadData, setUploadData] = useState({
    title: '',
    category: 'Uploaded Document',
    file: null as File | null,
  });

  const sampleArticles = [
    {
      title: 'Resetting your password',
      category: 'Account',
      content:
        'If a customer cannot sign in, send them the password reset link from the login page. The link is valid for 30 minutes. If it expires, request a new one.',
    },
    {
      title: 'Refund eligibility window',
      category: 'Billing',
      content:
        'Refunds are available within 14 days of purchase for unused subscriptions. For annual plans, issue a prorated refund based on unused time.',
    },
    {
      title: 'Troubleshooting email notifications',
      category: 'Product',
      content:
        'Ask the customer to verify notification settings, check spam folders, and confirm their email address. If the issue persists, collect a delivery timestamp and escalate to the mail logs.',
    },
  ];

  useEffect(() => {
    const loadArticles = async () => {
      try {
        const data = await knowledgeService.getAll();
        setArticles(data);
      } catch (error) {
        console.error('Failed to load articles:', error);
      } finally {
        setIsFetching(false);
      }
    };

    loadArticles();
  }, []);

  const closeComposer = () => {
    setIsComposerOpen(false);
    setFormData({ title: '', category: 'General', content: '' });
    setUploadData({ title: '', category: 'Uploaded Document', file: null });
  };

  const handleAddArticle = async () => {
    if (!formData.title || !formData.category || !formData.content) {
      alert('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const newArticle = await knowledgeService.create(formData);
      setArticles((prev) => [newArticle, ...prev]);
      setUploadNotice(null);
      closeComposer();
      alert('Knowledge article added successfully');
    } catch (error) {
      console.error('Failed to add article:', error);
      alert('Failed to add article. Check API server and authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadDocument = async () => {
    if (!uploadData.file) {
      alert('Please choose a PDF document to upload');
      return;
    }

    setIsLoading(true);
    try {
      const result = await knowledgeService.uploadDocument({
        file: uploadData.file,
        title: uploadData.title,
        category: uploadData.category,
      });
      setArticles((prev) => [result.article, ...prev]);
      setUploadNotice(`${result.uploadedFileName} indexed in ${result.chunksStored} chunk${result.chunksStored === 1 ? '' : 's'}.`);
      closeComposer();
    } catch (error) {
      console.error('Failed to upload document:', error);
      alert('Failed to upload document. Make sure the file is a readable PDF and the backend AI services are configured.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSamples = async () => {
    if (isSeeding) {
      return;
    }

    setIsSeeding(true);
    try {
      const created = await Promise.all(sampleArticles.map((article) => knowledgeService.create(article)));
      setArticles((prev) => [...created, ...prev]);
      alert('Sample knowledge articles added.');
    } catch (error) {
      console.error('Failed to add sample articles:', error);
      alert('Failed to add sample articles. Check API server and authentication.');
    } finally {
      setIsSeeding(false);
    }
  };

  if (isFetching) {
    return (
      <div className="page">
        <Spinner fullScreen />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Knowledge Base</h1>
          <p className="page-subtitle">
            Manage articles and uploaded PDF documents that feed AI and agent responses
          </p>
        </div>
        <div className="page-actions">
          <Button
            variant={composerMode === 'upload' ? 'secondary' : 'primary'}
            onClick={() => {
              setComposerMode('article');
              setIsComposerOpen(true);
            }}
          >
            <Plus size={18} />
            Add Article
          </Button>
          <Button
            variant={composerMode === 'upload' ? 'primary' : 'secondary'}
            onClick={() => {
              setComposerMode('upload');
              setIsComposerOpen(true);
            }}
          >
            <FileUp size={18} />
            Upload PDF
          </Button>
        </div>
      </div>

      {uploadNotice && (
        <Alert type="success" title="Document uploaded" onClose={() => setUploadNotice(null)}>
          {uploadNotice}
        </Alert>
      )}

      {isComposerOpen && (
        <Card className="form-card">
          <div className="knowledge-composer-toggle">
            <Button
              variant={composerMode === 'article' ? 'primary' : 'secondary'}
              onClick={() => setComposerMode('article')}
              disabled={isLoading}
            >
              Article
            </Button>
            <Button
              variant={composerMode === 'upload' ? 'primary' : 'secondary'}
              onClick={() => setComposerMode('upload')}
              disabled={isLoading}
            >
              PDF Upload
            </Button>
          </div>

          {composerMode === 'article' ? (
            <>
              <h2 className="section-title">New Article</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Input
                  label="Title"
                  placeholder="Article title..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  disabled={isLoading}
                />
                <Input
                  label="Category"
                  placeholder="e.g. Billing, Product, Account"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  disabled={isLoading}
                />
                <TextArea
                  label="Content"
                  placeholder="Article content..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  disabled={isLoading}
                />
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <Button variant="secondary" onClick={closeComposer} disabled={isLoading}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddArticle} disabled={isLoading}>
                    {isLoading ? 'Adding...' : 'Add Article'}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <h2 className="section-title">Upload PDF Document</h2>
              <p className="text-muted" style={{ marginTop: '-0.75rem', marginBottom: '1rem' }}>
                PDF text will be extracted, indexed for AI retrieval, and saved as a knowledge article for agents to review later.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Input
                  label="Title"
                  placeholder="Optional custom title"
                  value={uploadData.title}
                  onChange={(e) => setUploadData((prev) => ({ ...prev, title: e.target.value }))}
                  disabled={isLoading}
                />
                <Input
                  label="Category"
                  placeholder="e.g. Product Docs, Policies, Billing"
                  value={uploadData.category}
                  onChange={(e) => setUploadData((prev) => ({ ...prev, category: e.target.value }))}
                  disabled={isLoading}
                />
                <Input
                  label="PDF File"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => setUploadData((prev) => ({ ...prev, file: e.target.files?.[0] || null }))}
                  disabled={isLoading}
                />
                {uploadData.file && (
                  <div className="knowledge-upload-summary">
                    <span>{uploadData.file.name}</span>
                    <span>{Math.max(1, Math.round(uploadData.file.size / 1024))} KB</span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <Button variant="secondary" onClick={closeComposer} disabled={isLoading}>
                    Cancel
                  </Button>
                  <Button onClick={handleUploadDocument} disabled={isLoading}>
                    {isLoading ? 'Uploading...' : 'Upload PDF'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      )}

      {articles.length === 0 ? (
        <Card className="empty-card">
          <div className="empty-state">
            <p>No articles yet</p>
            <p className="text-muted">Add articles or upload PDF documents to seed the knowledge base</p>
            <Button onClick={handleAddSamples} disabled={isSeeding}>
              {isSeeding ? 'Seeding Demo Articles...' : 'Seed Demo Articles'}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="articles-list">
          {articles.map((article) => (
            <Card key={article.id} className="article-card">
              <h3 className="article-title">{article.title}</h3>
              <p className="article-preview">{article.content.substring(0, 150)}...</p>
              <div className="article-meta">
                <Badge variant="info">{article.category}</Badge>
                <span>{new Date(article.createdAt).toLocaleDateString()}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
