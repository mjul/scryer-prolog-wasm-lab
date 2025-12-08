import Multinationals from "../multinationals/index";
import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "Multinational Retail Chain" },
		{
			name: "description",
			content: "Reasoning about multinational sock shop companies",
		},
	];
}

export default function Home() {
	return <Multinationals />;
}
