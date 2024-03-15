import { Provider } from '@expressive/react';

import { Footer, Header } from './common/window';
import { Interface } from './editor/Interface';
import { Main } from './editor/Main';

export const App = () => {
  height: vh(100);
  boxSizing: border-box;
  padding: 0, 10;
  gridRows: min, minmax(0, "1fr"), min;
  overflow: hidden;

  <Provider for={{ Main }}>
    <Header />
    <Interface />
    <Footer />
  </Provider>
}

export default App;