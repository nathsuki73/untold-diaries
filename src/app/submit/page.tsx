"use client"

import SearchBar from "@/components/SearchBar"
import Link from 'next/link'
import Form from 'next/form'

export default function Submit() {
  return (
    <div className="flex items-center justify-center min-h-full bg-gray-100">
      <Form action="/submit" className="p-4 bg-white rounded shadow">
        <label htmlFor="to" className="block mb-2">To:</label>
        <input
          id="to"
          name="to"
          placeholder="Enter recipient"
          className="block w-full mb-4 p-2 border rounded"
        />
        <label htmlFor="message" className="block mb-2">Message:</label>
        <textarea
          id="message"
          name="message"
          placeholder="Enter message"
          className="block w-full mb-4 p-2 border rounded"
        />
        <button
          type="submit"
          className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Submit
        </button>
      </Form>
    </div>
  );
}
