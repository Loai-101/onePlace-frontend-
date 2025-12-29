# Lottie Animation Files

This folder is for Lottie animation JSON files that will be used throughout the platform.

## How to Add Animations

1. Add your Lottie animation JSON files (.json) to this folder
2. Files in the `public` folder are accessible via URL path `/lottiefiles/your-file.json`

## Usage in Components

### Using the LottieAnimation Component

```jsx
import LottieAnimation from '../components/LottieAnimation'

function MyComponent() {
  return (
    <LottieAnimation 
      src="/lottiefiles/your-animation.json" 
      width="200px" 
      height="200px"
      loop={true}
      autoplay={true}
    />
  )
}
```

### Direct Import (Alternative)

If you prefer to import directly:

```jsx
import Lottie from 'lottie-react'
import animationData from '/lottiefiles/your-animation.json'

function MyComponent() {
  return <Lottie animationData={animationData} />
}
```

## Installation

Make sure to install lottie-web or lottie-react:
```bash
npm install lottie-web
# or
npm install lottie-react
```

## File Structure

```
public/
  lottiefiles/
    ├── loading.json
    ├── success.json
    ├── error.json
    └── ... (your animation files)
```

## Notes

- Files in the `public` folder are served statically
- Use relative paths starting with `/lottiefiles/` to access files
- Keep file names descriptive and lowercase with hyphens (e.g., `loading-spinner.json`)
