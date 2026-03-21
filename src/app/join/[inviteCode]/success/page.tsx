export default function JoinSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-gray-900">You&apos;re connected!</h1>
        <p className="text-gray-500 mt-3">
          Your Instagram is now linked. Your network owner will let you know when you have campaigns to post.
        </p>
        <p className="text-sm text-gray-400 mt-6">You can close this tab.</p>
      </div>
    </div>
  );
}
