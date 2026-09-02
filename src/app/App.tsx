import QueryProvider from './QueryProvider';
import Router from './Router/Router';

function App() {
  return (
    <QueryProvider>
      <Router />
    </QueryProvider>
  );
}

export default App;
