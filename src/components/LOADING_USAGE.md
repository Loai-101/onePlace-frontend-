# Loading Component Usage Guide

The `Loading` component uses the Material wave loading animation and can be used throughout the platform when data is being loaded.

## Installation

The `lottie-react` package is already installed. The animation file should be in `public/lottiefiles/Material-wave-loading.json`.

## Basic Usage

```jsx
import Loading from '../components/Loading'

function MyComponent() {
  const [loading, setLoading] = useState(true)

  if (loading) {
    return <Loading message="Loading data..." />
  }

  return <div>Your content here</div>
}
```

## Props

- `size` (optional): `'small'` | `'medium'` | `'large'` - Default: `'medium'`
- `message` (optional): String - Loading message to display
- `fullScreen` (optional): Boolean - If true, shows full-screen overlay. Default: `false`
- `className` (optional): String - Additional CSS classes

## Examples

### Full Screen Loading (for page loads)
```jsx
if (loading) {
  return <Loading fullScreen message="Loading dashboard..." />
}
```

### Inline Loading (for sections)
```jsx
{loading && <Loading message="Loading products..." />}
```

### Small Loading (for buttons/actions)
```jsx
<Loading size="small" message="Saving..." />
```

### Large Loading (for important operations)
```jsx
<Loading size="large" message="Processing your request..." />
```

## Integration Examples

### In a Page Component
```jsx
function ProductsPage() {
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState([])

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    try {
      // Fetch data
      const response = await fetch('/api/products')
      const data = await response.json()
      setProducts(data)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Loading fullScreen message="Loading products..." />
  }

  return <div>{/* Your products list */}</div>
}
```

### In a Table/List
```jsx
function OrdersList() {
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState([])

  const refreshOrders = async () => {
    setLoading(true)
    try {
      // Fetch orders
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {loading && <Loading message="Refreshing orders..." />}
      <table>
        {/* Orders table */}
      </table>
    </div>
  )
}
```

## Notes

- The animation automatically loops
- The component handles loading the animation file from the public folder
- If the animation fails to load, it shows a fallback spinner
- The component is responsive and works on all screen sizes

