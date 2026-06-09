export default function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'h-4 w-4 border-2', md: 'h-7 w-7 border-[3px]', lg: 'h-10 w-10 border-4' }
  return (
    <div className={`animate-spin rounded-full border-zinc-200 border-t-red-600 ${sizes[size]} ${className}`} />
  )
}

export function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  )
}
