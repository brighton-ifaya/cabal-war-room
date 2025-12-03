import { WalletButton } from "../components/WalletButton";

export default function Home() {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-900 text-white">
			<h1 className="text-5xl font-extrabold mb-12 text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-yellow-500">
				CABAL: WAR ROOM
			</h1>

			<WalletButton />

			<p className="mt-12 text-xl text-gray-400">
				Connect your wallet to join the strategic CONCLAVE.
			</p>

			{/* Todo: main map/voting component will go here */}
		</main>
	);
}
