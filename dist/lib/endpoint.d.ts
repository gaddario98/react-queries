declare let endpoints: Record<string, string>;
declare const setEndpoints: (data: Record<string, string>) => void;
type Endpoint = Record<string, string>;
export { endpoints, type Endpoint, setEndpoints };
