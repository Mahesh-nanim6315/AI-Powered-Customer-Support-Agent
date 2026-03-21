import { useEffect, useState } from 'react';
import { Card, Button, Input, TextArea, Spinner, Badge, Alert } from '../components';
import { Plus } from 'lucide-react';
import { knowledgeService } from '../services/knowledge.service';
import type { KnowledgeBase } from '../types';
import '../page.css';

export function KnowledgePage() {
  const [isAddingArticle, setIsAddingArticle] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'General',
    content: '',
  });
  const [articles, setArticles] = useState<KnowledgeBase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

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

  const handleAddArticle = async () => {
    if (!formData.title || !formData.category || !formData.content) {
      alert('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const newArticle = await knowledgeService.create(formData);
      setArticles((prev) => [newArticle, ...prev]);
      setFormData({ title: '', category: 'General', content: '' });
      setIsAddingArticle(false);
      alert('Knowledge article added successfully');
    } catch (error) {
      console.error('Failed to add article:', error);
      alert('Failed to add article. Check API server and authentication.');
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
            Manage text knowledge articles that feed AI and agent responses
          </p>
        </div>
        <Button onClick={() => setIsAddingArticle(true)}>
          <Plus size={18} />
          Add Article
        </Button>
      </div>

      <Alert type="info" title="Current Scope">
        This UI supports listing and creating text articles only. File upload exists on the backend, but no document-upload workflow is wired into the frontend yet.
      </Alert>

      {isAddingArticle && (
        <Card className="form-card">
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
              <Button
                variant="secondary"
                onClick={() => setIsAddingArticle(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button onClick={handleAddArticle} disabled={isLoading}>
                {isLoading ? 'Adding...' : 'Add Article'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {articles.length === 0 ? (
        <Card className="empty-card">
          <div className="empty-state">
            <p>No articles yet</p>
            <p className="text-muted">Add articles to seed the current knowledge base</p>
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
