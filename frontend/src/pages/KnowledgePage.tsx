import { useEffect, useState } from 'react';
import { Card, Button, Input, TextArea, Spinner } from '../components';
import { Plus } from 'lucide-react';
import { knowledgeService } from '../services/knowledge.service';
import type { KnowledgeBase } from '../types';
import '../page.css';

export function KnowledgePage() {
  const [isAddingArticle, setIsAddingArticle] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
  });
  const [articles, setArticles] = useState<KnowledgeBase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

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
    if (!formData.title || !formData.content) {
      alert('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const newArticle = await knowledgeService.create(formData);
      setArticles((prev) => [newArticle, ...prev]);
      setFormData({ title: '', content: '' });
      setIsAddingArticle(false);
      alert('Knowledge article added successfully');
    } catch (error) {
      console.error('Failed to add article:', error);
      alert('Failed to add article. Check API server and authentication.');
    } finally {
      setIsLoading(false);
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
            Upload articles and documents to power AI responses
          </p>
        </div>
        <Button onClick={() => setIsAddingArticle(true)}>
          <Plus size={18} />
          Add Article
        </Button>
      </div>

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
            <p className="text-muted">Add articles to train your AI agent</p>
          </div>
        </Card>
      ) : (
        <div className="articles-list">
          {articles.map((article) => (
            <Card key={article.id} className="article-card">
              <h3 className="article-title">{article.title}</h3>
              <p className="article-preview">{article.content.substring(0, 150)}...</p>
              <div className="article-meta">
                {new Date(article.createdAt).toLocaleDateString()}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
