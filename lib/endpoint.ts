let endpoints: Record<string, string> = {
  custom: '',
};

const setEndpoints = (data: Record<string, string>) => {
  endpoints = { ...endpoints, ...data };
};

type Endpoint = Record<string, string>;
export { endpoints, type Endpoint, setEndpoints };
