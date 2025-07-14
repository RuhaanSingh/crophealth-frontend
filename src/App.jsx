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
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icon issue with Webpack/Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
} );

import './App.css'

// API Configuration
const API_BASE_URL = 'https://crophealth-backend.onrender.com/api'

// API Service
class APIService {
  constructor( ) {
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
  const [showAddFieldForm, setShowAddFieldForm] = useState(false)
  const [newFieldData, setNewFieldData] = useState({
    name: '',
    crop_type: '',
    polygon_geometry: '' // Will store GeoJSON string
  })
  const [addFieldLoading, setAddFieldLoading] = useState(false)
  const [addFieldError, setAddFieldError] = useState('')
  const [addFieldSuccess, setAddFieldSuccess] = useState(false)
  const [uploadImageLoading, setUploadImageLoading] = useState(false)
  const [uploadImageError, setUploadImageError] = useState('')
  const [uploadImageSuccess, setUploadImageSuccess] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [imageUploadFieldId, setImageUploadFieldId] = useState('')
  const [imageUploadLat, setImageUploadLat] = useState('')
  const [imageUploadLon, setImageUploadLon] = useState('')

  // State for map interaction
  const [mapCenter, setMapCenter] = useState([34.0522, -118.2437]); // Default to Los Angeles
  const [markerPosition, setMarkerPosition] = useState(null);
  const [polygonPoints, setPolygonPoints] = useState([]);

  // Map click handler for field creation
  function MapClickHandler() {
    const map = useMapEvents({
      click(e) {
        setPolygonPoints((prevPoints) => [...prevPoints, [e.latlng.lat, e.latlng.lng]]);
      },
    });
    return null;
  }

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

  const handleAddField = async (e) => {
    e.preventDefault()
    setAddFieldLoading(true)
    setAddFieldError('')
    setAddFieldSuccess(false)

    try {
      // Convert polygonPoints to GeoJSON string
      if (polygonPoints.length < 3) {
        setAddFieldError('Please draw a polygon with at least 3 points on the map.');
        return;
      }
      const geoJsonPolygon = {
        type: 'Polygon',
        coordinates: [polygonPoints.map(p => [p[1], p[0]])] // GeoJSON is [lon, lat]
      };
      const fieldDataToSend = {
        ...newFieldData,
        polygon_geometry: JSON.stringify(geoJsonPolygon)
      };

      await api.createField(fieldDataToSend)
      setAddFieldSuccess(true)
      setNewFieldData({ name: '', crop_type: '', polygon_geometry: '' })
      setPolygonPoints([]); // Clear drawn polygon
      setShowAddFieldForm(false)
      loadData() // Reload fields after adding new one
    } catch (err) {
      setAddFieldError(err.response?.data?.error || 'Failed to add field')
    } finally {
      setAddFieldLoading(false)
    }
  }

  const handleImageFileChange = (e) => {
    setSelectedFile(e.target.files[0])
  }

  const handleImageUpload = async (e) => {
    e.preventDefault()
    setUploadImageLoading(true)
    setUploadImageError('')
    setUploadImageSuccess(false)

    if (!selectedFile || !imageUploadFieldId || !imageUploadLat || !imageUploadLon) {
      setUploadImageError('Please fill all image upload fields and select a file.')
      setUploadImageLoading(false)
      return
    }

    const formData = new FormData()
    formData.append('image_file', selectedFile)
    formData.append('field_id', imageUploadFieldId)
    formData.append('latitude', imageUploadLat)
    formData.append('longitude', imageUploadLon)

    try {
      await api.uploadImage(formData)
      setUploadImageSuccess(true)
      setSelectedFile(null)
      setImageUploadFieldId('')
      setImageUploadLat('')
      setImageUploadLon('')
      loadData() // Reload data to update stats
    } catch (err) {
      setUploadImageError(err.response?.data?.error || 'Failed to upload image')
    } finally {
      setUploadImageLoading(false)
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
                    <Button onClick={() => setShowAddFieldForm(true)}>
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
              <Button onClick={() => setShowAddFieldForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add New Field
              </Button>
            </div>
            
            {showAddFieldForm && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Add New Field</CardTitle>
                  <CardDescription>Enter field details and draw its polygon on the map.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddField} className="space-y-4">
                    <div>
                      <Label htmlFor="fieldName">Field Name</Label>
                      <Input
                        id="fieldName"
                        type="text"
                        value={newFieldData.name}
                        onChange={(e) => setNewFieldData({ ...newFieldData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="cropType">Crop Type</Label>
                      <Input
                        id="cropType"
                        type="text"
                        value={newFieldData.crop_type}
                        onChange={(e) => setNewFieldData({ ...newFieldData, crop_type: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Draw Field Polygon (Click on map to add points)</Label>
                      <div className="h-64 w-full rounded-md overflow-hidden border">
                        <MapContainer center={mapCenter} zoom={10} style={{ height: '100%', width: '100%' }}>
                          <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                          />
                          <MapClickHandler />
                          {polygonPoints.map((position, idx ) => (
                            <Marker key={idx} position={position} />
                          ))}
                        </MapContainer>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => setPolygonPoints([])} className="mt-2">
                        Clear Polygon
                      </Button>
                    </div>
                    {addFieldError && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{addFieldError}</AlertDescription>
                      </Alert>
                    )}
                    {addFieldSuccess && (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>Field added successfully!</AlertDescription>
                      </Alert>
                    )}
                    <Button type="submit" className="w-full" disabled={addFieldLoading}>
                      {addFieldLoading ? 'Adding Field...' : 'Submit Field'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

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
                <form onSubmit={handleImageUpload} className="space-y-4">
                  <div>
                    <Label htmlFor="imageFile">Image File</Label>
                    <Input
                      id="imageFile"
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="imageField">Select Field</Label>
                    <select
                      id="imageField"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={imageUploadFieldId}
                      onChange={(e) => setImageUploadFieldId(e.target.value)}
                      required
                    >
                      <option value="">-- Select a field --</option>
                      {fields.map(field => (
                        <option key={field.id} value={field.id}>{field.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="imageLat">Latitude</Label>
                      <Input
                        id="imageLat"
                        type="number"
                        step="any"
                        value={imageUploadLat}
                        onChange={(e) => setImageUploadLat(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="imageLon">Longitude</Label>
                      <Input
                        id="imageLon"
                        type="number"
                        step="any"
                        value={imageUploadLon}
                        onChange={(e) => setImageUploadLon(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  {uploadImageError && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{uploadImageError}</AlertDescription>
                    </Alert>
                  )}
                  {uploadImageSuccess && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>Image uploaded successfully!</AlertDescription>
                    </Alert>
                  )}
                  <Button type="submit" className="w-full" disabled={uploadImageLoading}>
                    {uploadImageLoading ? 'Uploading Image...' : 'Upload Image'}
                  </Button>
                </form>
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
