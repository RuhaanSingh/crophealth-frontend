import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Separator } from '@/components/ui/separator.jsx'
import { 
  MapPin, 
  Upload, 
  Camera, 
  BarChart3, 
  Leaf, 
  AlertTriangle, 
  CheckCircle, 
  User,
  LogOut,
  Plus,
  Eye
} from 'lucide-react'
import axios from 'axios'
import './App.css'

// API Configuration
const API_BASE_URL = 'https://crophealth-backend.onrender.com/api'

// API Service
class APIService {
  constructor() {
    this.token = localStorage.getItem('token')
    this.axios = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    // Add token to requests if available
    this.axios.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`
      }
      return config
    })
  }

  setToken(token) {
    this.token = token
    localStorage.setItem('token', token)
  }

  clearToken() {
    this.token = null
    localStorage.removeItem('token')
  }

  async register(userData) {
    const response = await this.axios.post('/register', userData)
    return response.data
  }

  async login(credentials) {
    const response = await this.axios.post('/login', credentials)
    if (response.data.access_token) {
      this.setToken(response.data.access_token)
    }
    return response.data
  }

  async getProfile() {
    const response = await this.axios.get('/profile')
    return response.data
  }

  async getFields() {
    const response = await this.axios.get('/fields')
    return response.data
  }

  async createField(fieldData) {
    const response = await this.axios.post('/fields', fieldData)
    return response.data
  }

  async uploadImage(formData) {
    const response = await this.axios.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }

  async getFieldStats(fieldId, days = 30) {
    const response = await this.axios.get(`/field/${fieldId}/stats?days=${days}`)
    return response.data
  }

  async getOverallStats(days = 30) {
    const response = await this.axios.get(`/stats?days=${days}`)
    return response.data
  }
}

const api = new APIService()

// Authentication Component
function AuthForm({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isLogin) {
        await api.login({ email: formData.email, password: formData.password })
      } else {
        await api.register(formData)
        await api.login({ email: formData.email, password: formData.password })
      }
      onLogin()
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Leaf className="h-8 w-8 text-green-600 mr-2" />
            <h1 className="text-2xl font-bold text-green-800">CropHealth AI+</h1>
          </div>
          <CardTitle>{isLogin ? 'Sign In' : 'Create Account'}</CardTitle>
          <CardDescription>
            {isLogin ? 'Welcome back to your crop monitoring dashboard' : 'Join the smart farming revolution'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required={!isLogin}
                />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Dashboard Component
function Dashboard({ user, onLogout }) {
  const [fields, setFields] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [fieldsData, statsData] = await Promise.all([
        api.getFields(),
        api.getOverallStats()
      ])
      setFields(fieldsData)
      setStats(statsData)
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Leaf className="h-8 w-8 text-green-600 mx-auto mb-4 animate-spin" />
          <p>Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Leaf className="h-8 w-8 text-green-600 mr-2" />
              <h1 className="text-xl font-bold text-green-800">CropHealth AI+</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-600">
                <User className="h-4 w-4 mr-1" />
                {user.name}
              </div>
              <Button variant="outline" size="sm" onClick={onLogout}>
                <LogOut className="h-4 w-4 mr-1" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="fields">Fields</TabsTrigger>
            <TabsTrigger value="upload">Upload Image</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Fields</CardTitle>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.summary?.total_fields || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Images Analyzed</CardTitle>
                  <Camera className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.summary?.total_images || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Health Score</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats?.summary?.stress_distribution?.healthy ? 
                      Math.round(stats.summary.stress_distribution.healthy) + '%' : 'N/A'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Field Status Overview</CardTitle>
                <CardDescription>Current health status of your fields</CardDescription>
              </CardHeader>
              <CardContent>
                {fields.length === 0 ? (
                  <div className="text-center py-8">
                    <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No fields yet</h3>
                    <p className="text-gray-600 mb-4">Create your first field to start monitoring crop health</p>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Field
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fields.map((field) => (
                      <div key={field.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{field.name}</h4>
                          <p className="text-sm text-gray-600">{field.crop_type || 'No crop type specified'}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fields Tab */}
          <TabsContent value="fields" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">My Fields</h2>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add New Field
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {fields.map((field) => (
                <Card key={field.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <MapPin className="h-5 w-5 mr-2 text-green-600" />
                      {field.name}
                    </CardTitle>
                    <CardDescription>{field.crop_type || 'No crop type specified'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Created:</span>
                        <span>{new Date(field.created_at).toLocaleDateString()}</span>
                      </div>
                      <Separator />
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Upload className="h-4 w-4 mr-1" />
                          Upload
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload Crop Image</CardTitle>
                <CardDescription>
                  Upload an image of your crops for AI-powered health analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Image</h3>
                  <p className="text-gray-600 mb-4">Drag and drop an image or click to browse</p>
                  <Button>
                    <Camera className="h-4 w-4 mr-2" />
                    Choose Image
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Analytics Dashboard</CardTitle>
                <CardDescription>
                  Detailed insights and trends for your crop health data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Coming Soon</h3>
                  <p className="text-gray-600">Advanced analytics and reporting features will be available here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

// Main App Component
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const userData = await api.getProfile()
        setUser(userData)
        setIsAuthenticated(true)
      } catch (err) {
        localStorage.removeItem('token')
      }
    }
    setLoading(false)
  }

  const handleLogin = async () => {
    const userData = await api.getProfile()
    setUser(userData)
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    api.clearToken()
    setUser(null)
    setIsAuthenticated(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Leaf className="h-8 w-8 text-green-600 mx-auto mb-4 animate-spin" />
          <p>Loading CropHealth AI+...</p>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <div className="App">
        {isAuthenticated ? (
          <Dashboard user={user} onLogout={handleLogout} />
        ) : (
          <AuthForm onLogin={handleLogin} />
        )}
      </div>
    </Router>
  )
}

export default App

